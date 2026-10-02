"use client";

export const PAYWALL_EVENT = "postn:paywall";
export const PAY_TO_USE = "Trial ended. Pay to use.";

const ENDED_PREFIX = "postn:trial-ended:";

export function isLapsed(access?: string | null) {
  return access === "FREE";
}

export function openPaywall() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PAYWALL_EVENT));
}

export function hasSeenTrialEnded(userId: string) {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(`${ENDED_PREFIX}${userId}`) === "done";
  } catch {
    return true;
  }
}

export function finishTrialEnded(userId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${ENDED_PREFIX}${userId}`, "done");
  } catch {
    /* private mode */
  }
}
