import { describe, expect, it } from "vitest";
import { pickWebhookActor } from "./webhook-identity";

const checkout = {
  id: "chk_1",
  userId: "user_real",
  plan: "PRO",
  interval: "MONTHLY",
  providerRef: "sub_abc",
};

describe("pickWebhookActor", () => {
  it("takes userId from the checkout row, not notes", () => {
    const actor = pickWebhookActor({
      hint: {
        notesUserId: "user_attacker",
        checkoutId: "chk_1",
        providerSubscriptionId: "sub_abc",
      },
      checkout,
      subscription: null,
    });
    expect(actor.userId).toBe("user_real");
    expect(actor.notesMismatch).toBe(true);
    expect(actor.plan).toBe("PRO");
  });

  it("drops a checkout whose providerRef does not match the webhook", () => {
    const actor = pickWebhookActor({
      hint: {
        notesUserId: "user_attacker",
        checkoutId: "chk_1",
        providerSubscriptionId: "sub_other",
      },
      checkout,
      subscription: {
        userId: "user_sub",
        plan: "STUDIO",
        interval: "YEARLY",
        providerSubscriptionId: "sub_other",
      },
    });
    expect(actor.userId).toBe("user_sub");
    expect(actor.checkoutId).toBeUndefined();
  });
});
