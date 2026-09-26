"use client";

import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChannelIcon } from "@/components/accounts/channel-icons";
import { ChannelPreview } from "@/components/compose/preview-cards";
import {
  PLATFORM_LIMITS,
  platformCharCount,
  type ComposePlatform,
} from "@/lib/compose-text";

type Row = {
  platform: ComposePlatform;
  slug: string;
  label: string;
  handle: string;
};

const ROWS: Row[] = [
  { platform: "LINKEDIN", slug: "linkedin", label: "LinkedIn", handle: "your-brand" },
  { platform: "TWITTER", slug: "twitter", label: "X", handle: "yourbrand" },
  { platform: "TELEGRAM", slug: "telegram", label: "Telegram", handle: "yourchannel" },
  { platform: "SLACK", slug: "slack", label: "Slack", handle: "launch" },
  { platform: "DISCORD", slug: "discord", label: "Discord", handle: "updates" },
  { platform: "DEVTO", slug: "devto", label: "Dev.to", handle: "yourbrand" },
];

const ROUGH = "shipping scheduled publishing today. one draft, every feed, no more juggling six tabs.";
const POLISHED =
  "We just shipped scheduled publishing 🚀\n\nOne draft → six feeds. Zero copy-paste, zero tab-juggling.\n\nBuilt in India, tuned for IST. Your move, founders.";

const START = new Set<string>(["LINKEDIN", "TWITTER", "TELEGRAM"]);

function CursorArrow() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
      <path
        d="M4 2l6 16 2.5-6.5L19 9 4 2z"
        fill="#fff6e8"
        stroke="#1a1204"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The postN composer, playing itself: a ghost cursor picks channels, types,
 * polishes with Claude, and publishes — looping while on screen.
 */
export function ComposeDemo({ className = "" }: { className?: string }) {
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries(ROWS.map((r) => [r.platform, START.has(r.platform)])),
  );
  const [tab, setTab] = useState<string>("all");
  const [writing, setWriting] = useState(false);
  const [sent, setSent] = useState(false);
  const [pressed, setPressed] = useState<string | null>(null);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [ripple, setRipple] = useState(0);

  const shellRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const writeRef = useRef<HTMLButtonElement>(null);
  const postRef = useRef<HTMLButtonElement>(null);
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const runningRef = useRef(false);

  // Ghost cursor position (spring-smoothed).
  const cx = useMotionValue(80);
  const cy = useMotionValue(60);
  const sx = useSpring(cx, { stiffness: 90, damping: 16, mass: 0.7 });
  const sy = useSpring(cy, { stiffness: 90, damping: 16, mass: 0.7 });

  const selectedRows = ROWS.filter((r) => selected[r.platform]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setText(POLISHED);
      setSelected(Object.fromEntries(ROWS.map((r) => [r.platform, true])));
      return;
    }

    let alive = true;

    const sleep = (ms: number) =>
      new Promise<void>((res) => setTimeout(res, ms));

    const moveTo = async (el: HTMLElement | null, settle = 620) => {
      if (!el || !shellRef.current) return;
      const c = shellRef.current.getBoundingClientRect();
      const t = el.getBoundingClientRect();
      cx.set(t.left + t.width / 2 - c.left - 4);
      cy.set(t.top + t.height / 2 - c.top - 2);
      await sleep(settle);
    };

    const click = async (key?: string) => {
      setRipple((n) => n + 1);
      if (key) setPressed(key);
      await sleep(180);
      if (key) setPressed(null);
      await sleep(140);
    };

    const type = async (value: string, from = "") => {
      for (let i = 1; i <= value.length; i++) {
        if (!alive) return;
        setText(from + value.slice(0, i));
        await sleep(value[i - 1] === " " ? 26 : 34);
      }
    };

    const runOnce = async () => {
      // Reset to the opening state.
      setSent(false);
      setWriting(false);
      setTab("all");
      setText("");
      setSelected(
        Object.fromEntries(ROWS.map((r) => [r.platform, START.has(r.platform)])),
      );
      cx.set(80);
      cy.set(60);
      await sleep(700);
      setCursorVisible(true);

      // 1. Select two more channels.
      await moveTo(chipRefs.current.SLACK);
      await click("SLACK");
      setSelected((s) => ({ ...s, SLACK: true }));
      await sleep(220);

      await moveTo(chipRefs.current.DISCORD);
      await click("DISCORD");
      setSelected((s) => ({ ...s, DISCORD: true }));
      await sleep(360);

      // 2. Type a rough draft.
      await moveTo(areaRef.current, 500);
      await click();
      await type(ROUGH);
      await sleep(500);

      // 3. Write with Claude → polish.
      await moveTo(writeRef.current);
      await click("write");
      setWriting(true);
      await sleep(1100);
      setWriting(false);
      await type(POLISHED);
      await sleep(700);

      // 4. Publish everywhere.
      await moveTo(postRef.current);
      await click("post");
      setSent(true);
      await sleep(2600);
      setCursorVisible(false);
      await sleep(500);
    };

    const io = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting || runningRef.current) return;
        runningRef.current = true;
        while (alive) {
          if (document.hidden) {
            await sleep(400);
            continue;
          }
          await runOnce();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(shell);

    return () => {
      alive = false;
      io.disconnect();
      runningRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={shellRef}
      className={`relative overflow-hidden rounded-3xl border border-line/60 bg-card/70 shadow-2xl backdrop-blur ${className}`}
    >
          {/* Ghost cursor */}
          <motion.div
            style={{ x: sx, y: sy }}
            animate={{ opacity: cursorVisible ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none absolute left-0 top-0 z-50"
          >
            <CursorArrow />
            <AnimatePresence>
              <motion.span
                key={ripple}
                initial={{ scale: 0, opacity: 0.6 }}
                animate={{ scale: 2.4, opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="absolute -left-1 -top-1 size-8 rounded-full border-2 border-accent"
              />
            </AnimatePresence>
          </motion.div>

          {/* Window bar */}
          <div className="flex items-center gap-2 border-b border-line/50 px-5 py-3">
            <span className="size-3 rounded-full bg-[#ff5f57]" />
            <span className="size-3 rounded-full bg-[#febc2e]" />
            <span className="size-3 rounded-full bg-[#28c840]" />
            <span className="ml-3 text-sm font-bold">Compose</span>
            <span className="ml-auto rounded-lg bg-accent/15 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-accent">
              IST · 9:30 PM peak
            </span>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1.12fr_0.88fr]">
            {/* Composer side */}
            <div className="border-b border-line/50 p-5 lg:border-b-0 lg:border-r">
              {/* Channel chips */}
              <div className="flex flex-wrap gap-2">
                {ROWS.map((row) => {
                  const on = selected[row.platform];
                  return (
                    <button
                      key={row.platform}
                      ref={(el) => {
                        chipRefs.current[row.platform] = el;
                      }}
                      type="button"
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold transition-all ${
                        on
                          ? "bg-accent text-accent-fg"
                          : "border border-line text-muted"
                      } ${pressed === row.platform ? "scale-90" : ""}`}
                    >
                      <ChannelIcon slug={row.slug} className="size-4 rounded-md" />
                      {row.label}
                    </button>
                  );
                })}
              </div>

              {/* Tabs */}
              <div className="mt-4 flex gap-1 overflow-x-auto rounded-xl border border-line/60 bg-background/40 p-1">
                <TabButton label="All" on={tab === "all"} />
                {selectedRows.map((row) => (
                  <TabButton key={row.platform} label={row.label} on={tab === row.platform} />
                ))}
              </div>

              {/* Editor */}
              <div className="mt-3 overflow-hidden rounded-2xl border border-line/60 bg-background/40">
                <div className="flex flex-wrap items-center gap-1 border-b border-line/50 px-2 py-2">
                  <ToolBtn>B</ToolBtn>
                  <ToolBtn>
                    <span className="italic">I</span>
                  </ToolBtn>
                  <span className="px-2 text-[11px] font-bold uppercase tracking-wide text-muted">
                    U off
                  </span>
                  <span className="mx-1 h-5 w-px bg-line" />
                  <span className="rounded-lg px-2 py-1 text-sm font-semibold text-muted">
                    Add image
                  </span>
                  <span className="rounded-lg px-2 py-1 text-sm font-semibold text-muted">
                    Generate image
                    <span className="ml-1 text-[10px] font-extrabold uppercase text-accent">
                      PRO
                    </span>
                  </span>
                </div>
                <div
                  ref={areaRef}
                  className="min-h-[168px] px-4 pt-3 pb-3 text-base leading-relaxed"
                >
                  {text ? (
                    <span className="whitespace-pre-wrap">{text}</span>
                  ) : (
                    <span className="text-muted/50">
                      Write once. We&rsquo;ll show every selected feed on the right.
                    </span>
                  )}
                  <motion.span
                    aria-hidden
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="ml-0.5 inline-block h-5 w-0.5 -translate-y-0.5 bg-accent align-middle"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line/50 px-4 py-2 text-[12px] font-bold">
                  {selectedRows.map((row) => {
                    const count = platformCharCount(row.platform, text);
                    const limit = PLATFORM_LIMITS[row.platform];
                    const over = count > limit;
                    return (
                      <span key={row.platform} className={over ? "text-today" : "text-muted"}>
                        {row.label} {count.toLocaleString("en-IN")} /{" "}
                        {limit.toLocaleString("en-IN")}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* AI buttons */}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  ref={writeRef}
                  type="button"
                  className={`inline-flex items-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm font-bold text-accent-fg transition-transform ${
                    pressed === "write" ? "scale-90" : ""
                  }`}
                >
                  {writing ? <Spinner /> : null}
                  {writing ? "Writing…" : "Write with Claude"}
                </button>
                <span className="rounded-xl border border-line px-3 py-2 text-sm font-semibold text-muted">
                  Shorten for X
                </span>
                <span className="rounded-xl border border-line px-3 py-2 text-sm font-semibold text-muted">
                  India / IST
                </span>
                <span className="rounded-xl border border-line px-3 py-2 text-sm font-semibold text-muted">
                  Hashtags
                </span>
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted">
                  Save draft
                </span>
                <span className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted">
                  Schedule
                </span>
                <button
                  ref={postRef}
                  type="button"
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                    sent
                      ? "bg-[#28c840] text-white"
                      : "bg-accent text-accent-fg"
                  } ${pressed === "post" ? "scale-90" : ""}`}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {sent ? (
                      <motion.span
                        key="ok"
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.6, opacity: 0 }}
                        className="inline-flex items-center gap-2"
                      >
                        <CheckCircle2 className="size-4" /> Published to {selectedRows.length}!
                      </motion.span>
                    ) : (
                      <motion.span
                        key="post"
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.6, opacity: 0 }}
                      >
                        Post now
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </div>

            {/* Live preview side */}
            <div className="space-y-4 bg-[#0e0a18]/60 p-5">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted">
                Live preview
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {selectedRows.map((row, i) => (
                  <div key={row.platform} className="relative">
                    <ChannelPreview
                      platform={row.platform}
                      name="Your Brand"
                      handle={row.handle}
                      avatar={null}
                      body={text}
                      image={null}
                      when="9:30 PM"
                    />
                    <AnimatePresence>
                      {sent && (
                        <motion.span
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ delay: i * 0.12, type: "spring", stiffness: 400 }}
                          className="absolute -right-2 -top-2 z-10 rounded-full bg-[#28c840] p-1 text-white shadow-lg"
                        >
                          <CheckCircle2 className="size-4" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
      </div>
    </div>
  );
}

function TabButton({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold ${
        on ? "bg-accent text-accent-fg" : "text-muted"
      }`}
    >
      {label}
    </span>
  );
}

function ToolBtn({ children }: { children: ReactNode }) {
  return (
    <span className="min-w-8 rounded-lg px-2 py-1 text-center text-sm font-extrabold text-foreground/80">
      {children}
    </span>
  );
}

function Spinner() {
  return (
    <svg className="size-3.5 animate-spin" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
