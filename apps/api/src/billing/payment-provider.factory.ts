import { ConfigService } from "@nestjs/config";
import type { BillingProviderId } from "@postn/shared";
import type { PaymentProvider } from "./payment-provider";
import { RazorpayPaymentProvider } from "./razorpay.provider";
import { UnconfiguredPaymentProvider } from "./unconfigured.provider";

export const PAYMENT_PROVIDER = "PAYMENT_PROVIDER";

export function resolveBillingProviderId(raw?: string): BillingProviderId {
  const id = (raw ?? "none").trim().toLowerCase();
  if (id === "razorpay" || id === "stripe" || id === "none") return id;
  return "none";
}

export function createPaymentProvider(config: ConfigService): PaymentProvider {
  const id = resolveBillingProviderId(config.get<string>("BILLING_PROVIDER"));
  if (id === "razorpay") return new RazorpayPaymentProvider(config);
  return new UnconfiguredPaymentProvider(id);
}
