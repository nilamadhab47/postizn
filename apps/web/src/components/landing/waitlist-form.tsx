"use client";

import { CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
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
    } catch {
      setStatus("err");
      setMessage("Could not reach the waitlist. Try again in a bit.");
    }
  }

  const compact = size === "sm";

  return (
    <AnimatePresence mode="wait" initial={false}>
      {status === "ok" ? (
        <motion.div
          key="ok"
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={
            compact
              ? "flex w-full max-w-sm items-center gap-3 rounded-2xl border border-[#5ee6a8]/40 bg-[#5ee6a8]/10 px-4 py-3"
              : "flex w-full max-w-lg flex-col items-center gap-3 rounded-3xl border border-[#5ee6a8]/35 bg-[#5ee6a8]/10 px-6 py-7 text-center"
          }
        >
          <span
            className={`grid shrink-0 place-items-center rounded-full bg-[#5ee6a8] text-[#062016] ${
              compact ? "size-9" : "size-12"
            }`}
          >
            <CheckCircle2 className={compact ? "size-5" : "size-6"} strokeWidth={2.4} />
          </span>
          <div className={compact ? "min-w-0 text-left" : ""}>
            <p className={`font-extrabold tracking-tight ${compact ? "text-sm" : "text-xl"}`}>
              You&apos;re in.
            </p>
            <p className={`text-muted ${compact ? "text-xs" : "mt-1 text-sm"}`}>
              Check your inbox — we sent the welcome note.
            </p>
            {!compact ? (
              <a
                href="#demo"
                className="mt-4 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-accent-fg"
              >
                Watch it work →
              </a>
            ) : null}
          </div>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          id={id}
          onSubmit={onSubmit}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
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
              placeholder="you@brand.com"
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
              disabled={status === "saving"}
              className={`shrink-0 rounded-full bg-accent font-bold text-accent-fg transition hover:brightness-110 disabled:opacity-70 ${
                compact ? "px-4 py-2 text-sm" : "px-6 py-3.5 text-sm"
              }`}
            >
              {status === "saving" ? "Joining…" : "Join the waitlist"}
            </button>
          </div>
          {message ? (
            <p className="text-sm text-today">{message}</p>
          ) : (
            <p className="text-xs text-muted/70">
              Instant welcome note. Then silence until we open.
            </p>
          )}
        </motion.form>
      )}
    </AnimatePresence>
  );
}
