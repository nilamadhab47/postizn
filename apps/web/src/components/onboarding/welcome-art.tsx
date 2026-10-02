"use client";

import { motion, useReducedMotion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { ChannelIcon } from "@/components/accounts/channel-icons";
import type { ReactNode } from "react";

const LIVE = [
  "linkedin",
  "twitter",
  "telegram",
  "slack",
  "discord",
  "devto",
] as const;

const SPARKS = [
  { x: -72, y: -38 },
  { x: 64, y: -44 },
  { x: -28, y: -62 },
  { x: 18, y: -70 },
  { x: 86, y: -12 },
  { x: -88, y: 6 },
  { x: 52, y: 36 },
  { x: -46, y: 42 },
  { x: 8, y: 58 },
  { x: -12, y: -28 },
  { x: 38, y: -18 },
  { x: -60, y: -8 },
];

export function WelcomeHero({
  kind,
}: {
  kind: "trial" | "channel" | "pro" | "studio";
}) {
  const reduce = useReducedMotion();
  const celebrate = kind === "pro" || kind === "studio";
  const caption =
    kind === "studio"
      ? "Studio · the grid, unlocked"
      : kind === "pro"
        ? "Pro · every live channel"
        : kind === "channel"
          ? "Start with LinkedIn or X"
          : "Trial · LinkedIn + X";

  return (
    <div className="relative isolate overflow-hidden border-b border-accent/25 bg-[#1a1428] px-5 pb-5 pt-6">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-10 -top-16 size-56 rounded-full bg-accent/25 blur-3xl"
        animate={reduce ? undefined : { opacity: [0.35, 0.7, 0.35], scale: [1, 1.12, 1] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-8 top-4 size-44 rounded-full bg-[#8b6cff]/30 blur-3xl"
        animate={reduce ? undefined : { opacity: [0.25, 0.55, 0.25], y: [0, 10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      {celebrate ? <Burst reduce={Boolean(reduce)} /> : null}

      <p className="relative text-[11px] font-extrabold uppercase tracking-[0.22em] text-accent">
        {kind === "pro" || kind === "studio" ? "You’re in" : kind === "channel" ? "Step 2 of 2" : "Welcome"}
      </p>

      <div className="relative mt-4 flex items-end justify-between gap-3">
        <ComposerMark />
        <ChannelFan
          kind={kind}
          reduce={Boolean(reduce)}
        />
      </div>
      <p className="relative mt-3 text-xs font-bold text-accent/90">{caption}</p>
    </div>
  );
}

export function FeatureRow({
  icon: Icon,
  children,
  delay,
}: {
  icon: LucideIcon;
  children: ReactNode;
  delay: number;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="flex gap-3"
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
        <Icon className="size-4" strokeWidth={2.2} />
      </span>
      <span className="pt-1 text-sm font-semibold leading-snug text-muted">{children}</span>
    </motion.li>
  );
}

function ChannelFan({
  kind,
  reduce,
}: {
  kind: "trial" | "channel" | "pro" | "studio";
  reduce: boolean;
}) {
  const slugs =
    kind === "channel" ? (["linkedin", "twitter"] as const) : LIVE;
  return (
    <div className="flex items-center pr-1">
      {slugs.map((slug, i) => {
        const dimmed = kind === "trial" && slug !== "linkedin" && slug !== "twitter";
        return (
          <motion.span
            key={slug}
            className="relative"
            style={{ zIndex: slugs.length - i, marginLeft: i === 0 ? 0 : -10 }}
            initial={{ opacity: 0, y: 12, scale: 0.7 }}
            animate={
              reduce
                ? { opacity: dimmed ? 0.35 : 1, y: 0, scale: 1 }
                : {
                    opacity: dimmed ? 0.35 : 1,
                    y: [0, i % 2 === 0 ? -5 : -8, 0],
                    scale: 1,
                    rotate: i % 2 === 0 ? -6 : 6,
                  }
            }
            transition={
              reduce
                ? { duration: 0.3, delay: 0.08 * i }
                : {
                    opacity: { duration: 0.35, delay: 0.08 * i },
                    scale: { duration: 0.35, delay: 0.08 * i },
                    y: {
                      duration: 2.6 + i * 0.15,
                      delay: 0.4 + i * 0.08,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                    rotate: { duration: 0.4, delay: 0.08 * i },
                  }
            }
          >
            <ChannelIcon slug={slug} className="size-9 rounded-xl shadow-[0_8px_18px_-10px_rgba(0,0,0,0.8)]" />
          </motion.span>
        );
      })}
    </div>
  );
}

function ComposerMark() {
  return (
    <svg viewBox="0 0 132 88" className="h-[88px] w-[132px] drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)]" aria-hidden>
      <rect x="2" y="8" width="128" height="78" rx="16" fill="#221c33" stroke="rgba(255,176,32,0.45)" strokeWidth="2" />
      <rect x="2" y="8" width="128" height="22" rx="16" fill="#2c243f" />
      <rect x="2" y="18" width="128" height="12" fill="#2c243f" />
      <circle cx="18" cy="19" r="4" fill="#ff6b4a" />
      <circle cx="30" cy="19" r="4" fill="#ffb020" />
      <circle cx="42" cy="19" r="4" fill="#6fbf62" />
      <rect x="16" y="40" width="72" height="6" rx="3" fill="#ffb020" opacity="0.9" />
      <rect x="16" y="52" width="96" height="5" rx="2.5" fill="#fff6e8" opacity="0.28" />
      <rect x="16" y="62" width="80" height="5" rx="2.5" fill="#fff6e8" opacity="0.18" />
      <rect x="16" y="72" width="36" height="6" rx="3" fill="#8b6cff" opacity="0.8" />
    </svg>
  );
}

function Burst({ reduce }: { reduce: boolean }) {
  if (reduce) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {SPARKS.map((spark, i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-[42%] size-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(255,176,32,0.9)]"
          initial={{ opacity: 0, x: 0, y: 0, scale: 0.2 }}
          animate={{
            opacity: [0, 1, 0],
            x: spark.x,
            y: spark.y,
            scale: [0.2, 1.15, 0.3],
          }}
          transition={{ duration: 1.05, delay: 0.05 * i, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
