"use client";

import { motion } from "motion/react";
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  Clock,
  Heart,
  ImagePlus,
  MessageCircle,
  RefreshCw,
  Repeat2,
  Sparkles,
  Wand2,
} from "lucide-react";
import type { ReactNode } from "react";
import { ChannelIcon } from "@/components/accounts/channel-icons";
import { Reveal } from "./motion-bits";

/* ────────────────────────────────────────────────────────────
   Section
   ──────────────────────────────────────────────────────────── */

export function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-6xl px-6 py-28">
      <Reveal className="text-center">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-accent">
          Everything in one place
        </p>
        <h2 className="mx-auto mt-4 max-w-3xl text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
          All the tools to run your social,{" "}
          <span className="gradient-text">from one platform.</span>
        </h2>
        <div className="mx-auto mt-5 flex justify-center">
          <svg width="220" height="12" viewBox="0 0 220 12" fill="none" aria-hidden>
            <path
              d="M3 8C40 3 90 3 130 6C160 8 190 7 217 4"
              stroke="url(#feat-underline)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="feat-underline" x1="0" y1="0" x2="220" y2="0">
                <stop stopColor="#ffb020" />
                <stop offset="0.5" stopColor="#ff4ecd" />
                <stop offset="1" stopColor="#8b6cff" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </Reveal>

      <div className="mt-14 grid gap-5 lg:grid-cols-2">
        {/* Wide: planning / calendar */}
        <BentoCard
          color="#ffb020"
          label="Planning"
          icon={CalendarClock}
          title="Schedule to every channel at once"
          body="Write a post once, pick your channels, and set the time in IST. See the whole week on a visual calendar before anything goes out."
          className="lg:col-span-2"
          layout="row"
          mock={<CalendarMock />}
        />

        {/* 2x2 grid */}
        <BentoCard
          color="#8b6cff"
          label="AI assistant"
          icon={Sparkles}
          title="Draft & polish with Claude"
          body="Give the built-in AI a rough idea and get back a post ready to publish — drafts, rewrites, shorten-for-X, and hashtags, without the blank page."
          mock={<AiChatMock />}
        />
        <BentoCard
          color="#ff4ecd"
          label="AI image"
          icon={ImagePlus}
          title="Generate images from a prompt"
          body="Create post visuals right inside the composer. Describe what you want, generate it, and attach it to every channel in a click."
          mock={<ImageMock />}
        />
        <BentoCard
          color="#4ec9ff"
          label="Preview"
          icon={MessageCircle}
          title="See every feed before you post"
          body="Real, platform-accurate previews for LinkedIn, X, Telegram, Slack, Discord and Dev.to — so you know exactly how each post will look."
          mock={<PreviewMock />}
        />
        <BentoCard
          color="#5ee6a8"
          label="Reliability"
          icon={RefreshCw}
          title="A queue that never drops a post"
          body="Redis-backed scheduling with automatic retries. If one channel fails, the rest still publish — and you see the plain-language reason why."
          mock={<QueueMock />}
        />

        {/* Wide: notifications */}
        <BentoCard
          color="#ff6b4a"
          label="Notifications"
          icon={Bell}
          title="Know the moment it lands"
          body="Get an in-app alert for every publish and every failure, in real time. No refreshing, no guessing — just the status of each post as it happens."
          className="lg:col-span-2"
          layout="row"
          mock={<NotifyMock />}
        />
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
   Card shell
   ──────────────────────────────────────────────────────────── */

function BentoCard({
  color,
  label,
  icon: Icon,
  title,
  body,
  mock,
  className = "",
  layout = "col",
}: {
  color: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  body: string;
  mock: ReactNode;
  className?: string;
  layout?: "col" | "row";
}) {
  return (
    <Reveal className={`h-full ${className}`}>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="group relative flex h-full flex-col overflow-hidden rounded-3xl border p-7"
        style={{
          borderColor: `${color}40`,
          backgroundImage: `linear-gradient(160deg, ${color}22, ${color}08 55%, transparent)`,
        }}
      >
        {/* glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full opacity-40 blur-3xl transition-opacity duration-300 group-hover:opacity-70"
          style={{ backgroundColor: color }}
        />

        <div
          className={
            layout === "row"
              ? "relative flex flex-col gap-8 md:flex-row md:items-center"
              : "relative flex h-full flex-col"
          }
        >
          <div className={layout === "row" ? "md:flex-1" : ""}>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em]"
              style={{
                color,
                backgroundColor: `${color}1f`,
                border: `1px solid ${color}44`,
              }}
            >
              <Icon className="size-3.5" style={{ color }} />
              {label}
            </span>
            <h3 className="mt-4 text-2xl font-bold md:text-[26px]">{title}</h3>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted">
              {body}
            </p>
          </div>

          <div
            className={
              layout === "row"
                ? "md:w-[46%] md:shrink-0"
                : "mt-6 grow flex items-end"
            }
          >
            <div className="w-full">{mock}</div>
          </div>
        </div>
      </motion.div>
    </Reveal>
  );
}

/* ────────────────────────────────────────────────────────────
   Mockups (pure JSX, no external assets beyond channel icons)
   ──────────────────────────────────────────────────────────── */

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-line/60 bg-[#0e0a18]/80 p-3 shadow-xl backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}

function CalendarMock() {
  const days = ["Mon", "Tue", "Wed", "Thu"];
  const slots: { day: number; time: string; slug: string }[] = [
    { day: 0, time: "9:30", slug: "linkedin" },
    { day: 1, time: "1:00", slug: "twitter" },
    { day: 1, time: "7:50", slug: "telegram" },
    { day: 2, time: "2:15", slug: "slack" },
    { day: 3, time: "11:20", slug: "discord" },
    { day: 3, time: "6:40", slug: "devto" },
  ];
  return (
    <Panel>
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-bold text-foreground/80">This week · IST</span>
        <span className="flex items-center gap-1 text-muted">
          <span className="grid size-5 place-items-center rounded-md border border-line/60 text-[10px]">‹</span>
          <span className="grid size-5 place-items-center rounded-md border border-line/60 text-[10px]">›</span>
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {days.map((d, di) => (
          <div key={d} className="space-y-1.5">
            <div className="rounded-md bg-white/5 py-1 text-center text-[10px] font-bold text-muted">
              {d}
            </div>
            {slots
              .filter((s) => s.day === di)
              .map((s) => (
                <div
                  key={s.time}
                  className="flex items-center gap-1 rounded-md border border-line/50 bg-card/70 px-1.5 py-1"
                >
                  <ChannelIcon slug={s.slug} className="size-4 rounded" />
                  <span className="text-[9px] font-semibold text-muted">{s.time}</span>
                </div>
              ))}
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex gap-1.5">
        <span className="flex-1 rounded-md bg-accent/20 py-1.5 text-center text-[10px] font-bold text-accent">
          + New channel
        </span>
        <span className="flex-1 rounded-md border border-line/60 py-1.5 text-center text-[10px] font-bold text-muted">
          Generate posts
        </span>
      </div>
    </Panel>
  );
}

function AiChatMock() {
  return (
    <Panel>
      <div className="rounded-lg border border-line/50 bg-card/60 p-2 text-[11px] leading-snug text-muted">
        launching scheduled publishing today, one draft for every feed
      </div>
      <div className="mt-2 flex items-start gap-1.5">
        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-accent-2/25">
          <Sparkles className="size-3 text-accent-2" />
        </span>
        <div className="rounded-lg border border-accent-2/40 bg-accent-2/10 p-2 text-[11px] leading-snug text-foreground/90">
          We just shipped scheduled publishing 🚀 One draft → six feeds.{" "}
          <span className="font-bold">Zero copy-paste.</span>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex gap-1">
          {["Shorten", "Hashtags", "IST"].map((t) => (
            <span
              key={t}
              className="rounded-md border border-line/60 px-1.5 py-0.5 text-[9px] font-semibold text-muted"
            >
              {t}
            </span>
          ))}
        </div>
        <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-[10px] font-bold text-accent-fg">
          <Wand2 className="size-3" /> Write
        </span>
      </div>
    </Panel>
  );
}

function ImageMock() {
  const tints = ["#ffb020", "#8b6cff", "#ff4ecd", "#4ec9ff", "#5ee6a8", "#ff6b4a"];
  return (
    <Panel>
      <div className="flex gap-2">
        <div className="flex w-10 shrink-0 flex-col gap-1.5">
          {["Text", "Media", "AI"].map((t, i) => (
            <span
              key={t}
              className={`rounded-md py-1 text-center text-[8px] font-bold ${
                i === 2 ? "bg-accent-2/25 text-accent-2" : "bg-white/5 text-muted"
              }`}
            >
              {t}
            </span>
          ))}
        </div>
        <div className="grid flex-1 grid-cols-3 gap-1.5">
          {tints.map((c, i) => (
            <div
              key={i}
              className="aspect-square rounded-md"
              style={{
                backgroundImage: `linear-gradient(135deg, ${c}, ${c}55)`,
              }}
            />
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <span className="flex-1 truncate rounded-md border border-line/50 bg-card/60 px-2 py-1 text-[9px] text-muted">
          a founder&rsquo;s desk at golden hour…
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-[#ff4ecd] px-2 py-1 text-[9px] font-bold text-white">
          <Sparkles className="size-2.5" /> Generate
        </span>
      </div>
    </Panel>
  );
}

function MiniPreview({
  slug,
  name,
  handle,
}: {
  slug: string;
  name: string;
  handle: string;
}) {
  return (
    <div className="rounded-xl border border-line/50 bg-card/70 p-2.5">
      <div className="flex items-center gap-2">
        <ChannelIcon slug={slug} className="size-6 rounded-full" />
        <div className="leading-tight">
          <p className="text-[10px] font-bold text-foreground">{name}</p>
          <p className="text-[9px] text-muted">{handle}</p>
        </div>
      </div>
      <div className="mt-2 space-y-1">
        <div className="h-1.5 w-full rounded-full bg-white/10" />
        <div className="h-1.5 w-4/5 rounded-full bg-white/10" />
      </div>
      <div className="mt-2 flex gap-3 text-muted">
        <Heart className="size-3" />
        <MessageCircle className="size-3" />
        <Repeat2 className="size-3" />
      </div>
    </div>
  );
}

function PreviewMock() {
  return (
    <div className="grid grid-cols-2 gap-2">
      <MiniPreview slug="twitter" name="Your Brand" handle="@yourbrand" />
      <MiniPreview slug="linkedin" name="Your Brand" handle="your-brand" />
    </div>
  );
}

function QueueMock() {
  const rows: { slug: string; name: string; status: string; tone: string }[] = [
    { slug: "linkedin", name: "LinkedIn", status: "Published", tone: "#5ee6a8" },
    { slug: "twitter", name: "X", status: "Published", tone: "#5ee6a8" },
    { slug: "telegram", name: "Telegram", status: "Scheduled", tone: "#ffb020" },
    { slug: "discord", name: "Discord", status: "Retrying", tone: "#ff6b4a" },
  ];
  return (
    <Panel>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div
            key={r.slug}
            className="flex items-center gap-2 rounded-lg border border-line/50 bg-card/60 px-2 py-1.5"
          >
            <ChannelIcon slug={r.slug} className="size-5 rounded" />
            <span className="text-[10px] font-semibold text-foreground/85">{r.name}</span>
            <span
              className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold"
              style={{ color: r.tone, backgroundColor: `${r.tone}1f` }}
            >
              {r.status === "Published" ? (
                <CheckCircle2 className="size-2.5" />
              ) : r.status === "Retrying" ? (
                <RefreshCw className="size-2.5" />
              ) : (
                <Clock className="size-2.5" />
              )}
              {r.status}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function NotifyMock() {
  const items: { slug: string; text: string; tone: string; ok: boolean }[] = [
    { slug: "linkedin", text: "Published to LinkedIn", tone: "#5ee6a8", ok: true },
    { slug: "twitter", text: "Published to X", tone: "#5ee6a8", ok: true },
    { slug: "discord", text: "Discord failed · retrying", tone: "#ff6b4a", ok: false },
  ];
  return (
    <div className="space-y-2">
      {items.map((n, i) => (
        <motion.div
          key={n.slug}
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 + i * 0.12 }}
          className="flex items-center gap-2.5 rounded-xl border border-line/60 bg-[#0e0a18]/80 px-3 py-2 shadow-lg backdrop-blur"
        >
          <ChannelIcon slug={n.slug} className="size-6 rounded-lg" />
          <span className="text-[11px] font-semibold text-foreground/90">{n.text}</span>
          <span
            className="ml-auto grid size-5 place-items-center rounded-full"
            style={{ backgroundColor: `${n.tone}22`, color: n.tone }}
          >
            {n.ok ? <CheckCircle2 className="size-3.5" /> : <RefreshCw className="size-3.5" />}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
