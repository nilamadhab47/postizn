import type { BillingInterval, BillingProviderId, PaidPlanId } from "@postn/shared";

export const NORMALIZED_BILLING_EVENTS = [
  "checkout.completed",
  "subscription.activated",
  "subscription.renewed",
  "subscription.canceled",
  "subscription.expired",
  "payment.failed",
] as const;

export type NormalizedBillingEvent = (typeof NORMALIZED_BILLING_EVENTS)[number];

export type CheckoutInput = {
  checkoutId: string;
  userId: string;
  email: string;
  name: string | null;
  plan: PaidPlanId;
  interval: BillingInterval;
  amountPaise: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
};

export type CheckoutSession = {
  url: string;
  providerRef: string;
};

export type IncomingBillingEvent = {
  providerEventId: string;
  type: NormalizedBillingEvent;
  checkoutId?: string;
  userId?: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  plan?: PaidPlanId;
  interval?: BillingInterval;
  currentPeriodEnd?: Date;
  payload: unknown;
};

export interface PaymentProvider {
  readonly id: BillingProviderId;
  attached(): boolean;
  createCheckout(input: CheckoutInput): Promise<CheckoutSession>;
  parseWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<IncomingBillingEvent[]>;
}
