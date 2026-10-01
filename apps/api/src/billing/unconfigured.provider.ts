import { ServiceUnavailableException } from "@nestjs/common";
import type { BillingProviderId } from "@postn/shared";
import type {
  CheckoutInput,
  CheckoutSession,
  IncomingBillingEvent,
  PaymentProvider,
} from "./payment-provider";

/**
 * Default adapter. Tomorrow drop in RazorpayProvider or StripeProvider
 * behind BILLING_PROVIDER=razorpay|stripe. Do not grant plans from a
 * success URL — only BillingService.applyEvent().
 */
export class UnconfiguredPaymentProvider implements PaymentProvider {
  constructor(readonly id: BillingProviderId) {}

  attached() {
    return false;
  }

  createCheckout(_input: CheckoutInput): Promise<CheckoutSession> {
    throw new ServiceUnavailableException(
      `No payment adapter attached (${this.id}). Set BILLING_PROVIDER and add the provider file.`,
    );
  }

  parseWebhook(
    _rawBody: Buffer,
    _headers: Record<string, string | string[] | undefined>,
  ): Promise<IncomingBillingEvent[]> {
    throw new ServiceUnavailableException(
      `No payment adapter attached (${this.id}). Webhooks stay closed until one is wired.`,
    );
  }
}
