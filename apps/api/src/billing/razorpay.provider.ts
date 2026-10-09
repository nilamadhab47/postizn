import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "crypto";
import Razorpay from "razorpay";
import type { BillingInterval, PaidPlanId } from "@postn/shared";
import type {
  CheckoutInput,
  CheckoutSession,
  IncomingBillingEvent,
  PaymentProvider,
  SignatureInput,
} from "./payment-provider";

type RazorpayPlan = {
  id: string;
  period?: string;
  item?: { name?: string; amount?: number | string };
};

type RazorpaySubscription = {
  id: string;
  status?: string;
  current_end?: number | null;
  customer_id?: string | null;
  notes?: unknown;
};

type RazorpayClient = {
  plans: {
    all: (options: { count: number }) => Promise<{ items?: RazorpayPlan[] }>;
    create: (doc: {
      period: "monthly" | "yearly";
      interval: number;
      item: { name: string; amount: number; currency: string; description: string };
      notes: Record<string, string>;
    }) => Promise<RazorpayPlan>;
  };
  subscriptions: {
    create: (doc: {
      plan_id: string;
      total_count: number;
      quantity: number;
      customer_notify: 0 | 1;
      expire_by: number;
      notes: Record<string, string>;
    }) => Promise<RazorpaySubscription>;
    cancel: (
      id: string,
      options?: { cancel_at_cycle_end?: boolean },
    ) => Promise<RazorpaySubscription>;
  };
};

/**
 * Razorpay Subscriptions + Standard Checkout.
 * https://razorpay.com/docs/payments/subscriptions
 * KEY_SECRET stays in this process only.
 */
export class RazorpayPaymentProvider implements PaymentProvider {
  readonly id = "razorpay" as const;
  private readonly log = new Logger(RazorpayPaymentProvider.name);
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;
  private readonly config: ConfigService;
  private readonly client: RazorpayClient | null;
  private readonly planCache = new Map<string, string>();

  constructor(config: ConfigService) {
    this.config = config;
    this.keyId = (config.get<string>("RAZORPAY_KEY_ID") ?? "").trim();
    this.keySecret = (config.get<string>("RAZORPAY_KEY_SECRET") ?? "").trim();
    this.webhookSecret = (config.get<string>("RAZORPAY_WEBHOOK_SECRET") ?? "").trim();
    this.client =
      this.keyId && this.keySecret
        ? (new Razorpay({
            key_id: this.keyId,
            key_secret: this.keySecret,
          }) as unknown as RazorpayClient)
        : null;
  }

  attached() {
    return Boolean(this.client);
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutSession> {
    if (!this.client) {
      throw new ServiceUnavailableException("Razorpay keys are not set.");
    }
    if (input.amountPaise < 100) {
      throw new BadRequestException("Amount must be at least 100 paise.");
    }

    try {
      const planId = await this.ensurePlan(input);
      const expireBy = Math.floor(Date.now() / 1000) + 45 * 60;
      const totalCount = input.interval === "yearly" ? 10 : 120;
      const sub = await this.client.subscriptions.create({
        plan_id: planId,
        total_count: totalCount,
        quantity: 1,
        customer_notify: 1,
        expire_by: expireBy,
        notes: {
          checkoutId: input.checkoutId,
          userId: input.userId,
          plan: input.plan,
          interval: input.interval,
        },
      });
      return {
        providerRef: sub.id,
        subscriptionId: sub.id,
        amount: input.amountPaise,
        currency: input.currency,
        keyId: this.keyId,
      };
    } catch (err) {
      this.log.warn(`checkout failed: ${razorpayDetail(err)}`);
      throw mapRazorpayError(err);
    }
  }

  async cancelSubscription(providerSubscriptionId: string) {
    if (!this.client || !providerSubscriptionId.startsWith("sub_")) return;
    try {
      await this.client.subscriptions.cancel(providerSubscriptionId, {
        cancel_at_cycle_end: false,
      });
    } catch (err) {
      this.log.warn(`cancel ${providerSubscriptionId}: ${razorpayDetail(err)}`);
    }
  }

  verifyPaymentSignature(input: SignatureInput) {
    if (!this.keySecret || !input.paymentId || !input.signature) return false;
    const expected = input.subscriptionId
      ? createHmac("sha256", this.keySecret)
          .update(`${input.paymentId}|${input.subscriptionId}`)
          .digest("hex")
      : input.orderId
        ? createHmac("sha256", this.keySecret)
            .update(`${input.orderId}|${input.paymentId}`)
            .digest("hex")
        : null;
    if (!expected) return false;
    return timingSafeEqualHex(expected, input.signature);
  }

  async parseWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<IncomingBillingEvent[]> {
    if (!this.webhookSecret) {
      throw new ServiceUnavailableException(
        "RAZORPAY_WEBHOOK_SECRET is not set. Payment verify still works; webhooks stay closed.",
      );
    }
    const header = headerValue(headers, "x-razorpay-signature");
    if (!header) {
      throw new BadRequestException("Missing X-Razorpay-Signature");
    }
    const expected = createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex");
    if (!timingSafeEqualHex(expected, header)) {
      throw new BadRequestException("Invalid webhook signature");
    }

    let parsed: RazorpayWebhook;
    try {
      parsed = JSON.parse(rawBody.toString("utf8")) as RazorpayWebhook;
    } catch {
      throw new BadRequestException("Invalid webhook JSON");
    }

    const eventId = typeof parsed.id === "string" ? parsed.id : "";
    const sub = parsed.payload?.subscription?.entity;
    const payment = parsed.payload?.payment?.entity;
    const notes = notesOf(sub?.notes) ;
    const paymentNotes = notesOf(payment?.notes);
    const merged = { ...paymentNotes, ...notes };
    const checkoutId = merged.checkoutId || undefined;
    const periodEndAt = unixToDate(sub?.current_end) ?? periodEnd();

    if (parsed.event === "subscription.activated" || parsed.event === "subscription.charged") {
      const providerEventId = payment?.id || eventId;
      if (!providerEventId) return [];
      return [
        {
          providerEventId,
          type: parsed.event === "subscription.charged" ? "subscription.renewed" : "subscription.activated",
          checkoutId,
          providerSubscriptionId: sub?.id,
          providerCustomerId: sub?.customer_id ?? undefined,
          currentPeriodEnd: periodEndAt,
          payload: parsed,
        },
      ];
    }

    if (parsed.event === "subscription.cancelled" || parsed.event === "subscription.completed") {
      if (!eventId && !sub?.id) return [];
      return [
        {
          providerEventId: eventId || `ended_${sub?.id}`,
          type: parsed.event === "subscription.completed" ? "subscription.expired" : "subscription.canceled",
          checkoutId,
          providerSubscriptionId: sub?.id,
          payload: parsed,
        },
      ];
    }

    if (
      (parsed.event === "subscription.pending" ||
        parsed.event === "subscription.halted" ||
        parsed.event === "payment.failed") &&
      (payment?.id || eventId)
    ) {
      return [
        {
          providerEventId: payment?.id || eventId,
          type: "payment.failed",
          checkoutId,
          providerSubscriptionId: sub?.id,
          payload: parsed,
        },
      ];
    }

    if (parsed.event === "payment.captured" && payment?.id) {
      return [
        {
          providerEventId: payment.id,
          type: sub?.id || payment.subscription_id ? "subscription.activated" : "checkout.completed",
          checkoutId,
          providerSubscriptionId: sub?.id || payment.subscription_id,
          currentPeriodEnd: periodEndAt,
          payload: parsed,
        },
      ];
    }

    return [];
  }

  private async ensurePlan(input: CheckoutInput): Promise<string> {
    if (!this.client) {
      throw new ServiceUnavailableException("Razorpay keys are not set.");
    }
    const sku = `${input.plan}_${input.interval}`;
    const envKey = `RAZORPAY_PLAN_${input.plan}_${input.interval.toUpperCase()}`;
    const fromEnv = (this.config.get<string>(envKey) ?? "").trim();
    if (fromEnv) return fromEnv;
    const cached = this.planCache.get(sku);
    if (cached) return cached;

    const name = planName(input.plan, input.interval);
    const listed = await this.client.plans.all({ count: 100 });
    const match = (listed.items ?? []).find((row) => {
      const amount = Number(row.item?.amount);
      return row.item?.name === name && amount === input.amountPaise;
    });
    if (match?.id) {
      this.planCache.set(sku, match.id);
      return match.id;
    }

    const created = await this.client.plans.create({
      period: input.interval,
      interval: 1,
      item: {
        name,
        amount: input.amountPaise,
        currency: input.currency,
        description: `${input.plan === "STUDIO" ? "Studio" : "Pro"} billed ${input.interval}`,
      },
      notes: { sku },
    });
    this.planCache.set(sku, created.id);
    return created.id;
  }
}

export function periodEnd(interval?: BillingInterval): Date {
  const end = new Date();
  if (interval === "yearly") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
}

function planName(plan: PaidPlanId, interval: BillingInterval) {
  return `postN ${plan} ${interval}`;
}

function unixToDate(value?: number | null) {
  if (!value || value < 1) return undefined;
  return new Date(value * 1000);
}

type RazorpayWebhook = {
  id?: string;
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        subscription_id?: string;
        notes?: unknown;
      };
    };
    subscription?: {
      entity?: RazorpaySubscription;
    };
  };
};

function notesOf(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
) {
  const raw = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(raw) ? raw[0] : raw;
}

function timingSafeEqualHex(expected: string, actual: string) {
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function razorpayBits(err: unknown): { status?: number; detail: string } {
  const row = err as {
    statusCode?: number;
    status?: number;
    error?: { description?: string; code?: string } | string;
    response?: { status?: number; data?: { error?: { description?: string } } };
    message?: string;
  };
  let nested = row.error;
  if (typeof nested === "string") {
    try {
      nested = JSON.parse(nested) as { description?: string };
    } catch {
      nested = undefined;
    }
  }
  const detail =
    (typeof nested === "object" ? nested?.description : undefined) ||
    row.response?.data?.error?.description ||
    row.message ||
    "Razorpay subscription failed";
  return {
    status: row.statusCode ?? row.status ?? row.response?.status,
    detail,
  };
}

function razorpayDetail(err: unknown) {
  return razorpayBits(err).detail;
}

function mapRazorpayError(err: unknown): never {
  const { status, detail } = razorpayBits(err);
  if (status === 401 || /expired|authentication failed|api key/i.test(detail)) {
    throw new UnauthorizedException(
      /expired/i.test(detail)
        ? "Razorpay keys expired. Generate new Test API keys and paste KEY_ID + KEY_SECRET into the API .env."
        : "Razorpay authentication failed. Check Test KEY_ID and KEY_SECRET.",
    );
  }
  if (/not found on the server/i.test(detail)) {
    throw new BadRequestException(
      "Razorpay Subscriptions is not enabled on this account. Turn it on in Test mode, then try Upgrade again.",
    );
  }
  throw new InternalServerErrorException(detail);
}
