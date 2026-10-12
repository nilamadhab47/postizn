"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

type InviteRow = {
  id: string;
  email: string;
  name: string | null;
  acceptedAt: string | null;
  createdAt: string;
  url: string;
};

type WaitlistRow = {
  id: string;
  email: string;
  createdAt: string;
};

export function TestersPanel() {
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    const [inviteData, waitlistData] = await Promise.all([
      api<{ items: InviteRow[] }>("/auth/invites"),
      api<{ items: WaitlistRow[] }>("/auth/waitlist"),
    ]);
    setInvites(inviteData.items);
    setWaitlist(waitlistData.items);
  }, []);

  useEffect(() => {
    void load().catch(() => undefined);
  }, [load]);

  async function mint(nextEmail: string, nextName?: string) {
    setError(null);
    setPending(true);
    try {
      const invite = await api<InviteRow>("/auth/invites", {
        method: "POST",
        body: JSON.stringify({
          email: nextEmail,
          name: nextName || undefined,
        }),
      });
      await navigator.clipboard.writeText(invite.url).catch(() => undefined);
      setCopied(invite.id);
      setEmail("");
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create invite.");
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await mint(email, name);
  }

  async function copy(invite: InviteRow) {
    await navigator.clipboard.writeText(invite.url);
    setCopied(invite.id);
  }

  return (
    <div className="mt-10 max-w-lg">
      <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-accent">
        Testers
      </h2>
      <p className="mt-2 text-sm text-muted">
        Send a link. They set a password on that page. No public sign up, no Sign in
        on the homepage. Same link is welcome-back later.
      </p>

      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
        <label className="block">
          <span className="text-xs text-muted">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-line bg-background px-3 text-sm outline-none focus:border-accent"
            placeholder="founder@brand.in"
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Name (optional)</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-line bg-background px-3 text-sm outline-none focus:border-accent"
            placeholder="Their name"
          />
        </label>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-xl bg-accent text-sm font-bold text-accent-fg disabled:opacity-60"
        >
          {pending ? "Minting…" : "Create invite and copy link"}
        </button>
      </form>

      {waitlist.length ? (
        <div className="mt-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted">
            Waitlist
          </p>
          <ul className="mt-3 space-y-2">
            {waitlist.map((row) => {
              const invited = invites.find((item) => item.email === row.email);
              return (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5"
                >
                  <span className="min-w-0 truncate text-sm">{row.email}</span>
                  {invited ? (
                    <button
                      type="button"
                      onClick={() => void copy(invited)}
                      className="shrink-0 text-xs font-semibold text-accent"
                    >
                      {copied === invited.id ? "Copied" : "Copy link"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void mint(row.email)}
                      className="shrink-0 text-xs font-semibold text-accent disabled:opacity-60"
                    >
                      Invite
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted">No waitlist emails yet.</p>
      )}

      {invites.length ? (
        <div className="mt-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted">
            Invite links
          </p>
          <ul className="mt-3 space-y-2">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm">{invite.email}</span>
                  <span className="text-xs text-muted">
                    {invite.acceptedAt ? "Joined" : "Waiting"}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => void copy(invite)}
                  className="shrink-0 text-xs font-semibold text-accent"
                >
                  {copied === invite.id ? "Copied" : "Copy link"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
