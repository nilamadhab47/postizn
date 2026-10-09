export type WebhookIdentityHint = {
  notesUserId?: string;
  checkoutId?: string;
  providerSubscriptionId?: string;
  providerOrderId?: string;
};

export type WebhookCheckoutRow = {
  id: string;
  userId: string;
  plan: string;
  interval: string;
  providerRef: string | null;
};

export type WebhookSubscriptionRow = {
  userId: string;
  plan: string;
  interval: string;
  providerSubscriptionId: string | null;
};

export function pickWebhookActor(input: {
  hint: WebhookIdentityHint;
  checkout: WebhookCheckoutRow | null;
  subscription: WebhookSubscriptionRow | null;
}) {
  const checkout = checkoutMatchesHint(input.checkout, input.hint);
  const userId = checkout?.userId ?? input.subscription?.userId;
  const notesMismatch = Boolean(
    input.hint.notesUserId && userId && input.hint.notesUserId !== userId,
  );
  const plan = paidPlan(checkout?.plan) ?? paidPlan(input.subscription?.plan);
  const interval = checkout?.interval ?? input.subscription?.interval;
  return {
    userId,
    checkoutId: checkout?.id,
    plan,
    interval,
    notesMismatch,
  } as const;
}

function checkoutMatchesHint(
  checkout: WebhookCheckoutRow | null,
  hint: WebhookIdentityHint,
) {
  if (!checkout) return null;
  const refs = [hint.providerSubscriptionId, hint.providerOrderId].filter(
    Boolean,
  ) as string[];
  if (checkout.providerRef && refs.length && !refs.includes(checkout.providerRef)) {
    return null;
  }
  return checkout;
}

function paidPlan(plan?: string): "PRO" | "STUDIO" | undefined {
  return plan === "PRO" || plan === "STUDIO" ? plan : undefined;
}
