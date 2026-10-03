import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  BILLING_CURRENCY,
  PAID_SKUS,
  isBillingInterval,
  isPaidPlan,
  type BillingInterval,
  type PaidPlanId,
} from "@postn/shared";
import type {
  BillingInterval as PrismaInterval,
  BillingProvider as PrismaProvider,
  Plan,
} from "@prisma/client";
import { Prisma } from "@prisma/client";
import { EntitlementsService } from "../plan/entitlements.service";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import {
  PAYMENT_PROVIDER,
  resolveBillingProviderId,
} from "./payment-provider.factory";
import type {
  IncomingBillingEvent,
  PaymentProvider,
} from "./payment-provider";

@Injectable()
export class BillingService {
  private readonly log = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly entitlements: EntitlementsService,
    private readonly mail: MailService,
    @Inject(PAYMENT_PROVIDER) private readonly payments: PaymentProvider,
  ) {}

  catalog() {
    return {
      currency: BILLING_CURRENCY,
      provider: this.payments.id,
      attached: this.payments.attached(),
      plans: (["PRO", "STUDIO"] as const).map((plan) => ({
        id: plan,
        monthly: PAID_SKUS[plan].monthly,
        yearly: PAID_SKUS[plan].yearly,
      })),
    };
  }

  async status(userId: string) {
    const [user, subscription] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true, billingExempt: true },
      }),
      this.prisma.subscription.findUnique({ where: { userId } }),
    ]);
    return {
      ...this.catalog(),
      billingExempt: Boolean(user?.billingExempt),
      subscription: subscription
        ? {
            plan: subscription.plan,
            interval: fromPrismaInterval(subscription.interval),
            status: subscription.status,
            provider: subscription.provider.toLowerCase(),
            currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          }
        : null,
    };
  }

  async createCheckout(userId: string, planRaw: string, intervalRaw: string) {
    if (!isPaidPlan(planRaw)) {
      throw new BadRequestException("Pick Pro or Studio.");
    }
    if (!isBillingInterval(intervalRaw)) {
      throw new BadRequestException("Pick monthly or yearly.");
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException("Account not found.");
    if (user.billingExempt) {
      throw new BadRequestException("This login is billed off-session.");
    }
    if (!this.payments.attached()) {
      throw new ServiceUnavailableException(
        `Checkout is ready to attach ${this.payments.id === "none" ? "Razorpay or Stripe" : this.payments.id}. Set keys on the API, not in Next.js.`,
      );
    }

    const existing = await this.prisma.subscription.findUnique({ where: { userId } });
    if (existing && (existing.status === "ACTIVE" || existing.status === "PAST_DUE")) {
      const samePlan = existing.plan === planRaw;
      const sameInterval = existing.interval === toPrismaInterval(intervalRaw);
      if (samePlan && sameInterval) {
        throw new BadRequestException(
          `You're already on ${planRaw === "STUDIO" ? "Studio" : "Pro"} ${intervalRaw}.`,
        );
      }
      const downgradePlan = existing.plan === "STUDIO" && planRaw === "PRO";
      const downgradeInterval =
        samePlan && existing.interval === "YEARLY" && intervalRaw === "monthly";
      if (downgradePlan || downgradeInterval) {
        throw new BadRequestException(
          "That's a downgrade. Stay on the current cycle, or talk to us.",
        );
      }
    }

    const sku = PAID_SKUS[planRaw][intervalRaw];
    const frontend = (this.config.get<string>("FRONTEND_URL") ?? "http://localhost:3000").replace(
      /\/$/,
      "",
    );
    const checkout = await this.prisma.billingCheckout.create({
      data: {
        userId,
        plan: planRaw,
        interval: toPrismaInterval(intervalRaw),
        provider: toPrismaProvider(this.payments.id),
      },
    });

    const session = await this.payments.createCheckout({
      checkoutId: checkout.id,
      userId,
      email: user.email,
      name: user.name,
      plan: planRaw,
      interval: intervalRaw,
      amountPaise: sku.amountPaise,
      currency: BILLING_CURRENCY,
      successUrl: `${frontend}/settings?tab=account&billing=return&checkout=${checkout.id}`,
      cancelUrl: `${frontend}/settings?tab=account&billing=canceled`,
    });

    await this.prisma.billingCheckout.update({
      where: { id: checkout.id },
      data: { providerRef: session.providerRef },
    });

    return {
      checkoutId: checkout.id,
      plan: planRaw,
      interval: intervalRaw,
      url: session.url ?? null,
      keyId: session.keyId ?? null,
      orderId: session.orderId ?? null,
      subscriptionId: session.subscriptionId ?? null,
      amount: session.amount ?? sku.amountPaise,
      currency: session.currency ?? BILLING_CURRENCY,
    };
  }

  async verifyPayment(
    userId: string,
    body: {
      razorpay_order_id?: string;
      razorpay_subscription_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    },
  ) {
    const paymentId = body.razorpay_payment_id?.trim() ?? "";
    const signature = body.razorpay_signature?.trim() ?? "";
    const claimed =
      body.razorpay_subscription_id?.trim() || body.razorpay_order_id?.trim() || "";
    if (!paymentId || !signature || !claimed) {
      throw new BadRequestException("Missing payment fields");
    }
    if (!this.payments.attached()) {
      throw new ServiceUnavailableException("Payment adapter is not attached.");
    }

    const checkout = await this.prisma.billingCheckout.findFirst({
      where: { userId, providerRef: claimed },
    });
    if (!checkout?.providerRef) {
      throw new BadRequestException("Checkout not found for this payment");
    }

    const ref = checkout.providerRef;
    const subscriptionId = ref.startsWith("sub_") ? ref : undefined;
    const orderId = ref.startsWith("order_") ? ref : undefined;
    if (
      !this.payments.verifyPaymentSignature({
        paymentId,
        signature,
        subscriptionId,
        orderId,
      })
    ) {
      throw new BadRequestException("Payment signature mismatch");
    }

    const interval = fromPrismaInterval(checkout.interval);
    await this.applyEvent({
      providerEventId: paymentId,
      type: subscriptionId ? "subscription.activated" : "checkout.completed",
      checkoutId: checkout.id,
      userId,
      plan: checkout.plan === "STUDIO" ? "STUDIO" : "PRO",
      interval,
      providerSubscriptionId: subscriptionId,
      currentPeriodEnd: periodEndFrom(interval),
      payload: { paymentId, subscriptionId: subscriptionId ?? null, orderId: orderId ?? null },
    });

    return { ok: true, checkoutId: checkout.id, plan: checkout.plan };
  }

  async handleWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ) {
    const events = await this.payments.parseWebhook(rawBody, headers);
    this.log.log(`Webhook ${this.payments.id}: ${events.length} event(s)`);
    for (const event of events) {
      await this.applyEvent(event);
    }
    return { ok: true, received: events.length };
  }

  /** Only path that grants or revokes a paid plan. Checkout success URLs must not call this. */
  async applyEvent(event: IncomingBillingEvent) {
    const hydrated = await this.hydrate(event);
    const provider = toPrismaProvider(this.payments.id);
    try {
      await this.prisma.billingEvent.create({
        data: {
          provider,
          providerEventId: hydrated.providerEventId,
          type: hydrated.type,
          userId: hydrated.userId,
          checkoutId: hydrated.checkoutId,
          payload: hydrated.payload as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return { duplicate: true };
      }
      throw err;
    }

    if (
      hydrated.type === "checkout.completed" ||
      hydrated.type === "subscription.activated" ||
      hydrated.type === "subscription.renewed"
    ) {
      await this.activate(hydrated);
    } else if (hydrated.type === "subscription.canceled" || hydrated.type === "subscription.expired") {
      await this.revoke(hydrated);
    } else if (hydrated.type === "payment.failed") {
      await this.markPastDue(hydrated);
    }

    await this.prisma.billingEvent.updateMany({
      where: { provider, providerEventId: hydrated.providerEventId, processedAt: null },
      data: { processedAt: new Date() },
    });
    return { duplicate: false };
  }

  private async hydrate(event: IncomingBillingEvent): Promise<IncomingBillingEvent> {
    let userId = event.userId;
    let plan = event.plan;
    let interval = event.interval;
    let checkoutId = event.checkoutId;

    if (!userId && checkoutId) {
      const checkout = await this.prisma.billingCheckout.findUnique({ where: { id: checkoutId } });
      userId = checkout?.userId;
      if (!plan && (checkout?.plan === "PRO" || checkout?.plan === "STUDIO")) {
        plan = checkout.plan;
      }
      if (!interval && checkout) interval = fromPrismaInterval(checkout.interval);
    }

    if (!userId && event.providerSubscriptionId) {
      const sub = await this.prisma.subscription.findFirst({
        where: { providerSubscriptionId: event.providerSubscriptionId },
      });
      userId = sub?.userId;
      if (!plan && (sub?.plan === "PRO" || sub?.plan === "STUDIO")) {
        plan = sub.plan;
      }
      if (!interval && sub) interval = fromPrismaInterval(sub.interval);
    }

    return { ...event, userId, plan, interval, checkoutId };
  }

  private async activate(event: IncomingBillingEvent) {
    const checkout = event.checkoutId
      ? await this.prisma.billingCheckout.findUnique({ where: { id: event.checkoutId } })
      : null;
    const userId = event.userId ?? checkout?.userId;
    if (!userId) return;

    const plan = (event.plan ?? checkout?.plan) as Plan | undefined;
    if (plan !== "PRO" && plan !== "STUDIO") return;
    const interval = event.interval
      ? toPrismaInterval(event.interval)
      : checkout?.interval ?? "MONTHLY";

    const [user, prior] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true, plan: true, billingExempt: true },
      }),
      this.prisma.subscription.findUnique({ where: { userId } }),
    ]);
    if (!user) return;

    const alreadyPaid =
      (user.plan === "PRO" || user.plan === "STUDIO") && prior?.status === "ACTIVE";
    const priorEnd = prior?.currentPeriodEnd;
    const replacedSubId =
      prior?.providerSubscriptionId &&
      event.providerSubscriptionId &&
      prior.providerSubscriptionId !== event.providerSubscriptionId
        ? prior.providerSubscriptionId
        : null;

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { plan, trialClosedAt: new Date() },
      }),
      this.prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          plan,
          interval,
          status: "ACTIVE",
          provider: toPrismaProvider(this.payments.id),
          providerCustomerId: event.providerCustomerId,
          providerSubscriptionId: event.providerSubscriptionId,
          currentPeriodEnd: event.currentPeriodEnd,
        },
        update: {
          plan,
          interval,
          status: "ACTIVE",
          provider: toPrismaProvider(this.payments.id),
          providerCustomerId: event.providerCustomerId,
          providerSubscriptionId: event.providerSubscriptionId,
          currentPeriodEnd: event.currentPeriodEnd,
          cancelAtPeriodEnd: false,
        },
      }),
    ]);

    if (checkout) {
      await this.prisma.billingCheckout.update({
        where: { id: checkout.id },
        data: { status: "COMPLETED" },
      });
    }

    await this.entitlements.syncChannelAccess(userId);

    if (replacedSubId) {
      await this.payments.cancelSubscription(replacedSubId);
    }

    const billed = {
      email: user.email,
      name: user.name,
      billingExempt: user.billingExempt,
      plan,
      interval: fromPrismaInterval(interval),
      periodEnd: event.currentPeriodEnd ?? null,
    };
    const cycleChanged =
      Boolean(prior) && (prior!.plan !== plan || prior!.interval !== interval);
    if (!alreadyPaid || cycleChanged) {
      this.mail.paymentSucceeded(billed);
      return;
    }
    const moved =
      Boolean(event.currentPeriodEnd && priorEnd) &&
      (event.currentPeriodEnd as Date).getTime() > priorEnd!.getTime() + 12 * 60 * 60 * 1000;
    if (event.type === "subscription.renewed" && moved) {
      this.mail.subscriptionRenewed(billed);
    }
  }

  private async revoke(event: IncomingBillingEvent) {
    const checkout = event.checkoutId
      ? await this.prisma.billingCheckout.findUnique({ where: { id: event.checkoutId } })
      : null;
    const userId = event.userId ?? checkout?.userId;
    if (!userId) return;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, plan: true, billingExempt: true },
    });
    if (!user || user.billingExempt) return;
    const paidPlan = user.plan === "STUDIO" || user.plan === "PRO" ? user.plan : null;
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      select: { interval: true, providerSubscriptionId: true },
    });
    if (
      event.providerSubscriptionId &&
      sub?.providerSubscriptionId &&
      event.providerSubscriptionId !== sub.providerSubscriptionId
    ) {
      this.log.log(
        `Ignoring cancel for replaced subscription ${event.providerSubscriptionId}`,
      );
      return;
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { plan: "FREE" },
      }),
      this.prisma.subscription.updateMany({
        where: { userId },
        data: {
          status: event.type === "subscription.expired" ? "EXPIRED" : "CANCELED",
          cancelAtPeriodEnd: false,
        },
      }),
    ]);
    await this.entitlements.syncChannelAccess(userId);
    if (paidPlan) {
      this.mail.subscriptionEnded({
        email: user.email,
        name: user.name,
        billingExempt: user.billingExempt,
        plan: paidPlan,
        interval: sub ? fromPrismaInterval(sub.interval) : "monthly",
        reason: event.type === "subscription.expired" ? "expired" : "canceled",
      });
    }
  }

  private async markPastDue(event: IncomingBillingEvent) {
    let userId = event.userId;
    if (!userId && event.providerSubscriptionId) {
      const sub = await this.prisma.subscription.findFirst({
        where: { providerSubscriptionId: event.providerSubscriptionId },
        select: { userId: true },
      });
      userId = sub?.userId;
    }
    if (!userId) return;
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { user: { select: { email: true, name: true, billingExempt: true } } },
    });
    if (!sub) return;
    if (
      event.providerSubscriptionId &&
      sub.providerSubscriptionId &&
      event.providerSubscriptionId !== sub.providerSubscriptionId
    ) {
      return;
    }
    if (!sub || sub.status === "PAST_DUE") {
      await this.prisma.subscription.updateMany({
        where: { userId },
        data: { status: "PAST_DUE" },
      });
      return;
    }
    await this.prisma.subscription.updateMany({
      where: { userId },
      data: { status: "PAST_DUE" },
    });
    if (sub.plan === "PRO" || sub.plan === "STUDIO") {
      this.mail.paymentFailed({
        email: sub.user.email,
        name: sub.user.name,
        billingExempt: sub.user.billingExempt,
        plan: sub.plan,
        interval: fromPrismaInterval(sub.interval),
        periodEnd: sub.currentPeriodEnd,
      });
    }
  }
}

function toPrismaInterval(interval: BillingInterval): PrismaInterval {
  return interval === "yearly" ? "YEARLY" : "MONTHLY";
}

function fromPrismaInterval(interval: PrismaInterval): BillingInterval {
  return interval === "YEARLY" ? "yearly" : "monthly";
}

function periodEndFrom(interval: BillingInterval) {
  const end = new Date();
  if (interval === "yearly") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
}

function toPrismaProvider(id: string): PrismaProvider {
  if (id === "razorpay") return "RAZORPAY";
  if (id === "stripe") return "STRIPE";
  return "NONE";
}
