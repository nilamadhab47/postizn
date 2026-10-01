"use client";

import { useEffect, useState } from "react";
import { API_URL, api } from "@/lib/api";
import { ChannelIcon } from "@/components/accounts/channel-icons";

type Providers = { google: boolean; linkedin: boolean; twitter: boolean };

export function OauthButtons({
  mode,
}: {
  mode: "login" | "register";
}) {
  const [providers, setProviders] = useState<Providers | null>(null);

  useEffect(() => {
    void api<Providers>("/auth/providers")
      .then(setProviders)
      .catch(() =>
        setProviders({ google: true, linkedin: true, twitter: true }),
      );
  }, []);

  const google = providers?.google ?? false;
  const linkedin = providers?.linkedin ?? false;
  const twitter = providers?.twitter ?? false;
  if (!providers || (!google && !linkedin && !twitter)) return null;

  const verb = mode === "register" ? "Sign up" : "Continue";

  return (
    <div className="mt-6 flex flex-col gap-2">
      {google ? (
        <a
          href={`${API_URL}/auth/google`}
          className="flex h-12 items-center justify-center gap-2.5 rounded-xl border border-line bg-background text-sm font-semibold hover:border-accent/50"
        >
          <GoogleMark />
          {verb} with Google
        </a>
      ) : null}
      {linkedin ? (
        <a
          href={`${API_URL}/auth/linkedin`}
          className="flex h-12 items-center justify-center gap-2.5 rounded-xl border border-line bg-background text-sm font-semibold hover:border-accent/50"
        >
          <ChannelIcon slug="linkedin" className="size-5 rounded-md" />
          {verb} with LinkedIn
        </a>
      ) : null}
      {twitter ? (
        <a
          href={`${API_URL}/auth/twitter`}
          className="flex h-12 items-center justify-center gap-2.5 rounded-xl border border-line bg-background text-sm font-semibold hover:border-accent/50"
        >
          <ChannelIcon slug="twitter" className="size-5 rounded-md" />
          {verb} with X
        </a>
      ) : null}
      <div className="relative my-2">
        <div className="h-px bg-line" />
        <p className="absolute inset-x-0 -top-2.5 text-center">
          <span className="bg-card px-3 text-xs text-muted">or email</span>
        </p>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.4 21.4 7.4 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.4 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4V6.5H1.4C.5 8.2 0 10.1 0 12s.5 3.8 1.4 5.5l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.7 0 3.3.6 4.5 1.7l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.6 1.4 6.5l4 3.1C6.3 6.8 8.9 4.8 12 4.8z"
      />
    </svg>
  );
}
