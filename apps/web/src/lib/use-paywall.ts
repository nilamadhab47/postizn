"use client";

import { useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { isLapsed, openPaywall } from "@/lib/paywall";

export function usePaywall() {
  const { user } = useAuth();
  const lapsed = isLapsed(user?.entitlements?.access ?? user?.plan);

  const block = useCallback(() => {
    if (!lapsed) return false;
    openPaywall();
    return true;
  }, [lapsed]);

  return { lapsed, block };
}
