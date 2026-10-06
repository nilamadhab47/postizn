"use client";

import posthog from "posthog-js";

type Props = Record<string, string | number | boolean | string[] | undefined>;

export function track(event: string, properties?: Props) {
  if (typeof window === "undefined") return;
  posthog.capture(event, properties);
}

export function identifyUser(user: {
  id: string;
  email: string;
  name?: string | null;
  plan?: string;
}) {
  if (typeof window === "undefined") return;
  posthog.identify(user.id, {
    email: user.email,
    name: user.name ?? undefined,
    plan: user.plan,
  });
}

export function resetUser() {
  if (typeof window === "undefined") return;
  posthog.reset();
}
