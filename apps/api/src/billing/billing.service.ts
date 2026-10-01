import {
  BadRequestException,
  Inject,
  Injectable,
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly entitlements: EntitlementsService,
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
        `Checkout is ready to attach ${this.payments.id === "none" ? "Razorpay or Stripe" : this.payments.id}. No card is taken in this app — the adapter opens the provider hosted page.`,
      );
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

    return { url: session.url, checkoutId: checkout.id, plan: planRaw, interval: intervalRaw };
  }

  async handleWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ) {
    const events = await this.payments.parseWebhook(rawBody, headers);
    for (const event of events) {
      await this.applyEvent(event);
    }
    return { ok: true, received: events.length };
  }

  /** Only path that grants or revokes a paid plan. Checkout success URLs must not call this. */
  async applyEvent(event: IncomingBillingEvent) {
    const provider = toPrismaProvider(this.payments.id);
    try {
      await this.prisma.billingEvent.create({
        data: {
          provider,
          providerEventId: event.providerEventId,
          type: event.type,
          userId: event.userId,
          checkoutId: event.checkoutId,
          payload: event.payload as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return { duplicate: true };
      }
      throw err;
    }

    if (
      event.type === "checkout.completed" ||
      event.type === "subscription.activated" ||
      event.type === "subscription.renewed"
    ) {
      await this.activate(event);
    } else if (event.type === "subscription.canceled" || event.type === "subscription.expired") {
      await this.revoke(event);
    } else if (event.type === "payment.failed") {
      await this.markPastDue(event);
    }

    await this.prisma.billingEvent.updateMany({
      where: { provider, providerEventId: event.providerEventId, processedAt: null },
      data: { processedAt: new Date() },
    });
    return { duplicate: false };
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
  }

  private async revoke(event: IncomingBillingEvent) {
    const checkout = event.checkoutId
      ? await this.prisma.billingCheckout.findUnique({ where: { id: event.checkoutId } })
      : null;
    const userId = event.userId ?? checkout?.userId;
    if (!userId) return;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { billingExempt: true },
    });
    if (user?.billingExempt) return;

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
  }

  private async markPastDue(event: IncomingBillingEvent) {
    const userId = event.userId;
    if (!userId) return;
    await this.prisma.subscription.updateMany({
      where: { userId },
      data: { status: "PAST_DUE" },
    });
  }
}

function toPrismaInterval(interval: BillingInterval): PrismaInterval {
  return interval === "yearly" ? "YEARLY" : "MONTHLY";
}

function fromPrismaInterval(interval: PrismaInterval): BillingInterval {
  return interval === "YEARLY" ? "yearly" : "monthly";
}

function toPrismaProvider(id: string): PrismaProvider {
  if (id === "razorpay") return "RAZORPAY";
  if (id === "stripe") return "STRIPE";
  return "NONE";
}
