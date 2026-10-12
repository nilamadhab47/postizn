import { describe, expect, it } from "vitest";
import { capsFor, resolveAccess, trialStartData } from "./entitlements";

const now = new Date("2026-10-12T00:00:00.000Z");

describe("resolveAccess", () => {
  it("gives testers on trial LinkedIn and X only", () => {
    expect(
      resolveAccess(
        {
          plan: "FREE",
          billingExempt: false,
          trialEndsAt: new Date("2026-10-20T00:00:00.000Z"),
          promoProEndsAt: null,
        },
        now,
      ),
    ).toBe("TRIAL");
    expect(capsFor("TRIAL").canUsePaidChannel).toBe(false);
  });

  it("turns POSTNPRO into Pro until the courtesy window ends", () => {
    expect(
      resolveAccess(
        {
          plan: "FREE",
          billingExempt: false,
          trialEndsAt: new Date("2026-10-01T00:00:00.000Z"),
          promoProEndsAt: new Date("2026-10-20T00:00:00.000Z"),
        },
        now,
      ),
    ).toBe("PRO");
  });

  it("drops to Free when trial and promo are both over", () => {
    expect(
      resolveAccess(
        {
          plan: "FREE",
          billingExempt: false,
          trialEndsAt: new Date("2026-10-01T00:00:00.000Z"),
          promoProEndsAt: new Date("2026-10-02T00:00:00.000Z"),
        },
        now,
      ),
    ).toBe("FREE");
  });

  it("keeps founder / Track B accounts on Pro via billingExempt", () => {
    expect(
      resolveAccess(
        {
          plan: "FREE",
          billingExempt: true,
          trialEndsAt: null,
          promoProEndsAt: null,
        },
        now,
      ),
    ).toBe("PRO");
    expect(capsFor("PRO", true).channelLimit).toBe(20);
  });
});

describe("trialStartData", () => {
  it("opens a 14-day trial from now", () => {
    const start = trialStartData(now);
    expect(start.trialEndsAt.getTime() - now.getTime()).toBe(14 * 24 * 60 * 60 * 1000);
  });
});
