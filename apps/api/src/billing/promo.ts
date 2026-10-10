import { PROMO_PRO_DAYS, TRIAL_EXTENDED_DAYS } from "../plan/entitlements";

export function normalizePromoCode(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function extendedTrialEndsAt(startedAt: Date | null | undefined, now = new Date()) {
  const start = startedAt ?? now;
  return new Date(start.getTime() + TRIAL_EXTENDED_DAYS * 24 * 60 * 60 * 1000);
}

export function promoProEndsAt(now = new Date()) {
  return new Date(now.getTime() + PROMO_PRO_DAYS * 24 * 60 * 60 * 1000);
}

export function daysLeft(ends: Date | null | undefined, now = new Date()) {
  if (!ends) return null;
  return Math.max(0, Math.ceil((ends.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
}
