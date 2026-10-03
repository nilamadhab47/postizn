import { ServiceUnavailableException } from "@nestjs/common";
import type { BillingProviderId } from "@postn/shared";
import type {
  CheckoutInput,
  CheckoutSession,
  IncomingBillingEvent,
  PaymentProvider,
  SignatureInput,
} from "./payment-provider";

/**
 * Default when BILLING_PROVIDER is none/stripe. Razorpay lives in
 * razorpay.provider.ts. Do not grant plans from a success URL —
 * only BillingService.applyEvent().
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

  verifyPaymentSignature(_input?: SignatureInput) {
    return false;
  }

  async cancelSubscription(_providerSubscriptionId: string) {}

  parseWebhook(
    _rawBody: Buffer,
    _headers: Record<string, string | string[] | undefined>,
  ): Promise<IncomingBillingEvent[]> {
    throw new ServiceUnavailableException(
      `No payment adapter attached (${this.id}). Webhooks stay closed until one is wired.`,
    );
  }
}
