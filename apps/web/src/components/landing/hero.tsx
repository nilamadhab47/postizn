"use client";

import { motion, useScroll, useTransform } from "motion/react";
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
      setNow(
        new Date().toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
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

function QuestionCopy() {
  return (
    <>
      <div className="flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-semibold text-accent backdrop-blur">
        <Clock className="size-3.5" />
        IST <IstClock /> · A question for every founder
      </div>
      <h1 className="mt-8 max-w-5xl text-5xl font-extrabold leading-[1.04] tracking-tight text-foreground md:text-8xl">
        How do you show up on{" "}
        <span className="gradient-text">six platforms</span> at once?
      </h1>
      <p className="mt-7 max-w-2xl text-lg font-medium text-foreground/75 md:text-2xl">
        Copy. Paste. Reformat. Repeat — LinkedIn, X, Telegram, Slack, Discord,
        Dev.to. Every single launch.
      </p>
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

export function Hero({ waitlistMode }: { waitlistMode: boolean }) {
  const isDesktop = useIsDesktop();
  const ref = useRef<HTMLDivElement>(null);

  // ["start start", "end end"]: progress 0 → pin starts, 1 → pin releases.
  // Every phase below lives entirely inside the pinned range, so nothing
  // animates while the section is scrolling away (the old jank).
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // Act 1 — pitch black, only the question.
  const qOpacity = useTransform(scrollYProgress, [0.14, 0.26], [1, 0]);
  const qScale = useTransform(scrollYProgress, [0.14, 0.26], [1, 0.93]);
  const qY = useTransform(scrollYProgress, [0.14, 0.26], [0, -60]);

  // Act 2 — the question is gone; the demo alone in the dark.
  const dOpacity = useTransform(scrollYProgress, [0.24, 0.38], [0, 1]);
  const dScale = useTransform(scrollYProgress, [0.24, 0.5], [0.8, 1]);
  const dY = useTransform(scrollYProgress, [0.24, 0.5], [140, 0]);

  // Act 3 — the reveal: auroras + nav fade in, the question returns as the
  // hero heading above the demo, CTA appears below.
  const revealOpacity = useTransform(scrollYProgress, [0.55, 0.7], [0, 1]);
  const titleOpacity = useTransform(scrollYProgress, [0.58, 0.72], [0, 1]);
  const titleY = useTransform(scrollYProgress, [0.58, 0.72], [24, 0]);
  const ctaOpacity = useTransform(scrollYProgress, [0.62, 0.76], [0, 1]);

  const hintOpacity = useTransform(scrollYProgress, [0.45, 0.55], [1, 0]);

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
    <section ref={ref} id="demo" className="relative h-[320vh]">
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
          style={{ opacity: qOpacity, scale: qScale, y: qY }}
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
            How do you show up on{" "}
            <span className="gradient-text">six platforms</span> at once?{" "}
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
