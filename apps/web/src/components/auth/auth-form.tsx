"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, type Me } from "@/lib/api";
import { SAMPLE_ACCOUNT } from "@/lib/sample-account";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isRegister = mode === "register";

  useEffect(() => {
    void api<Me>("/auth/me")
      .then(() => router.replace("/dashboard"))
      .catch(() => undefined);
  }, [router]);

  function fillSample() {
    setEmail(SAMPLE_ACCOUNT.email);
    setPassword(SAMPLE_ACCOUNT.password);
    setError(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (isRegister && !name.trim()) {
      setError("Enter your name");
      return;
    }
    if (isRegister && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setPending(true);
    try {
      await api<Me>(isRegister ? "/auth/register" : "/auth/login", {
        method: "POST",
        body: JSON.stringify(
          isRegister ? { name, email, password } : { email, password },
        ),
      });
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : isRegister
            ? "Could not create account. Try again."
            : "Could not sign in. Try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-3">
      {isRegister ? (
        <label className="block">
          <span className="text-xs text-muted">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
            className="mt-1 h-12 w-full rounded-xl border border-line bg-background px-3 text-base outline-none focus:border-accent"
            placeholder="Your name"
          />
        </label>
      ) : null}
      <label className="block">
        <span className="text-xs text-muted">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
            className="mt-1 h-12 w-full rounded-xl border border-line bg-background px-3 text-base outline-none focus:border-accent"
          placeholder="you@company.com"
        />
      </label>
      <label className="block">
        <span className="text-xs text-muted">Password</span>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isRegister ? "new-password" : "current-password"}
            className="mt-1 h-12 w-full rounded-xl border border-line bg-background px-3 text-base outline-none focus:border-accent"
          placeholder="At least 8 characters"
        />
      </label>
      {isRegister ? (
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
      ) : (
        <button
          type="button"
          onClick={fillSample}
          className="rounded-md border border-line px-3 py-2 text-left text-xs text-muted hover:border-accent/50 hover:text-foreground"
        >
          Sample account: {SAMPLE_ACCOUNT.email} / {SAMPLE_ACCOUNT.password}
        </button>
      )}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 flex h-12 items-center justify-center rounded-xl bg-accent text-base font-bold text-accent-fg disabled:opacity-60"
      >
        {pending
          ? "Please wait…"
          : isRegister
            ? "Sign up"
            : "Sign in"}
      </button>
    </form>
  );
}
