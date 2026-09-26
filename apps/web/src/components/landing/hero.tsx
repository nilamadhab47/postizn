"use client";

import { motion, useMotionValue, useTransform } from "motion/react";
import { ArrowRight, Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ComposeDemo } from "./live-demo";
import { ShimmerButton } from "./motion-bits";
import { WaitlistForm } from "./waitlist-form";

export function useIsDesktop() {
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
}

function IstClock() {
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    const tick = () =>
      // The visitor's own clock — postN schedules in whatever timezone you think in.
      setNow(
        new Date().toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="tabular-nums">{now || "—:—:—"}</span>;
}

function HeroBackdrop() {
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="aurora-1 absolute left-[8%] top-[18%] h-[420px] w-[420px] rounded-full bg-accent/20 blur-[110px]" />
        <div className="aurora-2 absolute left-[38%] top-[45%] h-[380px] w-[380px] rounded-full bg-[#ff4ecd]/12 blur-[120px]" />
        <div className="aurora-3 absolute right-[10%] top-[20%] h-[460px] w-[460px] rounded-full bg-accent-2/18 blur-[120px]" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,246,232,0.07) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 45%, black 30%, transparent 75%)",
        }}
      />
    </>
  );
}

const wordVariant = {
  hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

/** The landing question, with a staggered blur-rise entrance on page load. */
function QuestionCopy() {
  const words = "How many tabs does it take to".split(" ");
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-semibold text-accent backdrop-blur"
      >
        <Clock className="size-3.5" />
        <IstClock /> · a question for every founder
      </motion.div>
      <motion.h1
        initial="hidden"
        animate="show"
        variants={{
          show: { transition: { staggerChildren: 0.09, delayChildren: 0.35 } },
        }}
        className="mt-8 max-w-5xl text-5xl font-extrabold leading-[1.04] tracking-tight text-foreground md:text-8xl"
      >
        {words.map((word) => (
          <motion.span key={word} variants={wordVariant} className="inline-block">
            {word}&nbsp;
          </motion.span>
        ))}
        <motion.span
          variants={{
            hidden: { opacity: 0, y: 30, scale: 0.9, filter: "blur(12px)" },
            show: {
              opacity: 1,
              y: 0,
              scale: 1,
              filter: "blur(0px)",
              transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
            },
          }}
          className="gradient-text inline-block"
        >
          announce one launch?
        </motion.span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.35, ease: "easeOut" }}
        className="mt-7 max-w-2xl text-lg font-medium text-foreground/75 md:text-2xl"
      >
        Copy. Paste. Reformat. Repeat — for every platform your audience lives
        on. There&apos;s a better way, and you&apos;re scrolling toward it.
      </motion.p>
    </>
  );
}

function DemoCta({ waitlistMode }: { waitlistMode: boolean }) {
  return waitlistMode ? (
    <WaitlistForm id="hero-waitlist" size="sm" />
  ) : (
    <ShimmerButton href="/register">
      Start posting free
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
    </ShimmerButton>
  );
}

/**
 * Progress (0→1) through a pinned section's scroll range. Owns the math via
 * getBoundingClientRect instead of useScroll's cached offset measurement,
 * which was drifting out of sync with the real scroll position (black
 * screens / ghost text mid-scroll).
 */
export function usePinProgress(ref: React.RefObject<HTMLDivElement | null>) {
  const progress = useMotionValue(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const total = el.offsetHeight - window.innerHeight;
      const scrolled = -el.getBoundingClientRect().top;
      progress.set(total > 0 ? Math.min(1, Math.max(0, scrolled / total)) : 0);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [progress, ref]);
  return progress;
}

export function Hero({ waitlistMode }: { waitlistMode: boolean }) {
  const isDesktop = useIsDesktop();
  const ref = useRef<HTMLDivElement>(null);
  const progress = usePinProgress(ref);

  // Act 1 — pitch black, only the question. Fully gone by 0.26, BEFORE the
  // demo starts at 0.3 — the phases never overlap, and the visibility gate
  // removes it from paint entirely (the demo card is translucent glass, so a
  // merely-faded question would ghost through it).
  const qOpacity = useTransform(progress, [0.1, 0.26], [1, 0]);
  const qScale = useTransform(progress, [0.1, 0.26], [1, 0.93]);
  const qY = useTransform(progress, [0.1, 0.26], [0, -60]);
  const qBlur = useTransform(progress, [0.1, 0.26], ["blur(0px)", "blur(14px)"]);
  const qVisibility = useTransform(progress, (v) =>
    v >= 0.27 ? ("hidden" as const) : ("visible" as const),
  );

  // Act 2 — the demo AND its title arrive together, attached.
  const dOpacity = useTransform(progress, [0.3, 0.46], [0, 1]);
  const dScale = useTransform(progress, [0.3, 0.54], [0.8, 1]);
  const dY = useTransform(progress, [0.3, 0.54], [140, 0]);
  const titleOpacity = useTransform(progress, [0.34, 0.5], [0, 1]);
  const titleY = useTransform(progress, [0.34, 0.5], [24, 0]);

  // Act 3 — the reveal: auroras + nav fade in, CTA appears. Everything is
  // fully on screen by 0.72; the rest is a short dwell before the unpin.
  const revealOpacity = useTransform(progress, [0.56, 0.7], [0, 1]);
  const ctaOpacity = useTransform(progress, [0.58, 0.72], [0, 1]);

  const hintOpacity = useTransform(progress, [0.48, 0.56], [1, 0]);

  if (!isDesktop) {
    // Mobile: same story, normal flow — no pinning.
    return (
      <section id="demo" className="relative overflow-hidden px-6 pb-20 pt-32">
        <HeroBackdrop />
        <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center text-center">
          <QuestionCopy />
          <p className="mt-14 text-sm font-bold uppercase tracking-[0.3em] text-accent">
            Like this.
          </p>
          <ComposeDemo className="mt-5 w-full" />
          <div className="mt-8 flex w-full justify-center">
            <DemoCta waitlistMode={waitlistMode} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} id="demo" className="relative h-[240vh]">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden bg-black px-6">
        {/* Act 3 backdrop: the real site (auroras + dot grid) fades in over black */}
        <motion.div
          style={{ opacity: revealOpacity }}
          className="pointer-events-none absolute inset-0 bg-background"
        >
          <HeroBackdrop />
        </motion.div>

        {/* Act 1: the question, alone in the dark */}
        <motion.div
          style={{
            opacity: qOpacity,
            scale: qScale,
            y: qY,
            filter: qBlur,
            visibility: qVisibility,
          }}
          className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center"
        >
          <QuestionCopy />
        </motion.div>

        {/* Scroll hint — lives until the reveal */}
        <motion.div
          style={{ opacity: hintOpacity }}
          className="pointer-events-none absolute inset-x-0 bottom-10 z-10 flex flex-col items-center gap-2.5"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-9 w-5 items-start justify-center rounded-full border border-line/70 p-1.5"
          >
            <div className="h-2 w-1 rounded-full bg-accent" />
          </motion.div>
          <span className="text-xs text-muted/60">keep scrolling</span>
        </motion.div>

        {/* Acts 2 + 3: the demo, then the question crowning it as the hero */}
        <motion.div
          style={{ opacity: dOpacity, scale: dScale, y: dY }}
          className="relative z-20 w-full max-w-5xl"
        >
          <motion.h2
            style={{ opacity: titleOpacity, y: titleY }}
            className="text-center text-3xl font-extrabold tracking-tight md:text-4xl"
          >
            One tab. <span className="gradient-text">Every platform.</span>{" "}
            <span className="text-muted">Like this.</span>
          </motion.h2>
          <ComposeDemo className="mt-6" />
          <motion.div
            style={{ opacity: ctaOpacity }}
            className="mt-6 flex justify-center"
          >
            <DemoCta waitlistMode={waitlistMode} />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
