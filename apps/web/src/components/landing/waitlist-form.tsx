"use client";

import { useState, type FormEvent } from "react";

export function WaitlistForm({
  size = "md",
  id,
}: {
  size?: "sm" | "md";
  id?: string;
}) {
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company: hp }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setStatus("err");
        setMessage(body.message ?? "Could not join right now. Try again.");
        return;
      }
      setStatus("ok");
      setEmail("");
      setMessage("You're on the list. We'll mail you the moment we open.");
    } catch {
      setStatus("err");
      setMessage("Could not reach the waitlist. Try again in a bit.");
    }
  }

  const compact = size === "sm";

  return (
    <form
      id={id}
      onSubmit={onSubmit}
      className={compact ? "flex w-full max-w-sm flex-col gap-2" : "flex w-full max-w-lg flex-col gap-3"}
    >
      <div className={compact ? "flex gap-2" : "flex flex-col gap-3 sm:flex-row"}>
        <label className="sr-only" htmlFor={id ? `${id}-email` : "waitlist-email"}>
          Email
        </label>
        <input
          id={id ? `${id}-email` : "waitlist-email"}
          type="email"
          required
          autoComplete="email"
          placeholder="you@brand.in"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`min-w-0 flex-1 rounded-full border border-line/70 bg-background/70 px-4 text-foreground outline-none placeholder:text-muted/60 focus:border-accent ${
            compact ? "py-2 text-sm" : "py-3.5 text-sm"
          }`}
        />
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          className="hidden"
          aria-hidden
        />
        <button
          type="submit"
          disabled={status === "saving" || status === "ok"}
          className={`shrink-0 rounded-full bg-accent font-bold text-accent-fg transition-opacity disabled:opacity-70 ${
            compact ? "px-4 py-2 text-sm" : "px-6 py-3.5 text-sm"
          }`}
        >
          {status === "saving" ? "Joining…" : status === "ok" ? "You're in" : "Join the waitlist"}
        </button>
      </div>
      {message ? (
        <p className={`text-sm ${status === "err" ? "text-today" : "text-muted"}`}>{message}</p>
      ) : (
        <p className="text-xs text-muted/70">No spam. One mail when we open the doors.</p>
      )}
    </form>
  );
}
