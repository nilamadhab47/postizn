import { describe, expect, it } from "vitest";
import { extendedTrialEndsAt, normalizePromoCode, promoProEndsAt } from "./promo";

describe("promo helpers", () => {
  it("normalizes codes", () => {
    expect(normalizePromoCode(" postn30 ")).toBe("POSTN30");
    expect(normalizePromoCode("postn pro")).toBe("POSTNPRO");
  });

  it("stretches trial to 30 days from start", () => {
    const start = new Date("2026-10-01T00:00:00.000Z");
    const ends = extendedTrialEndsAt(start);
    expect(ends.getTime() - start.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("grants 14 days of Pro from now", () => {
    const now = new Date("2026-10-10T00:00:00.000Z");
    expect(promoProEndsAt(now).toISOString()).toBe("2026-10-24T00:00:00.000Z");
  });
});
