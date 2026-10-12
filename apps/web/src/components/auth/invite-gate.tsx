"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, type Me } from "@/lib/api";
import { identifyUser, track } from "@/lib/analytics";

type InvitePreview = {
  email: string;
  name: string | null;
  accepted: boolean;
};

export function InviteGate({ token }: { token: string }) {
  const router = useRouter();
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [missing, setMissing] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void api<Me>("/auth/me")
      .then(() => router.replace("/dashboard"))
      .catch(() => undefined);
  }, [router]);

  useEffect(() => {
    void api<InvitePreview>(`/auth/invite/${token}`)
      .then((data) => {
        setInvite(data);
        setName(data.name ?? "");
      })
      .catch(() => setMissing(true));
  }, [token]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!invite?.accepted && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setPending(true);
    try {
      const me = await api<Me>(`/auth/invite/${token}`, {
        method: "POST",
        body: JSON.stringify(
          invite?.accepted ? { password } : { password, name },
        ),
      });
      identifyUser(me);
      track(invite?.accepted ? "user_logged_in" : "user_signed_up", {
        via: "invite",
      });
      if (!invite?.accepted) {
        try {
          sessionStorage.setItem("postn:fresh-account", "1");
        } catch {
          /* ignore */
        }
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not open this invite. Try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-xl border border-line bg-card p-8">
        <p className="flex items-center gap-2.5">
          <img src="/icon.png" alt="postN" width={36} height={36} className="rounded-xl" />
          <span className="text-3xl font-extrabold tracking-tight">
            post<span className="text-accent">N</span>
          </span>
        </p>
        {missing ? (
          <>
            <h1 className="mt-6 text-3xl font-bold">Invite not found</h1>
            <p className="mt-2 text-sm text-muted">
              This link is expired or was typed wrong. Ask Nilamadhab for a new one.
            </p>
          </>
        ) : !invite ? (
          <p className="mt-6 text-sm text-muted">Opening your invite…</p>
        ) : (
          <>
            <h1 className="mt-6 text-3xl font-bold">
              {invite.accepted ? "Welcome back" : "You are invited"}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {invite.accepted
                ? `Sign in with the password you set for ${invite.email}.`
                : `Set a password for ${invite.email}. This is the only way in while postN is invite-only.`}
            </p>
            <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
              {invite.accepted ? null : (
                <label className="block">
                  <span className="text-xs text-muted">Name</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className="mt-1 h-12 w-full rounded-xl border border-line bg-background px-3 text-base outline-none focus:border-accent"
                    placeholder="Your name"
                  />
                </label>
              )}
              <label className="block">
                <span className="text-xs text-muted">Password</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={invite.accepted ? "current-password" : "new-password"}
                  className="mt-1 h-12 w-full rounded-xl border border-line bg-background px-3 text-base outline-none focus:border-accent"
                  placeholder="At least 8 characters"
                />
              </label>
              {invite.accepted ? null : (
                <label className="block">
                  <span className="text-xs text-muted">Confirm password</span>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="mt-1 h-12 w-full rounded-xl border border-line bg-background px-3 text-base outline-none focus:border-accent"
                    placeholder="Repeat password"
                  />
                </label>
              )}
              {error ? <p className="text-sm text-red-400">{error}</p> : null}
              <button
                type="submit"
                disabled={pending}
                className="mt-2 flex h-12 items-center justify-center rounded-xl bg-accent text-base font-bold text-accent-fg disabled:opacity-60"
              >
                {pending
                  ? "Please wait…"
                  : invite.accepted
                    ? "Sign in"
                    : "Join postN"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
