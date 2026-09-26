"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight, Clock, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IconGlobe } from "./icon-globe";
import { ShimmerButton, SplitWords } from "./motion-bits";
import { WaitlistForm } from "./waitlist-form";

function useIsDesktop() {
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

export function Hero({ waitlistMode }: { waitlistMode: boolean }) {
  const isDesktop = useIsDesktop();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  // NOTE: the sticky child unpins around progress ~0.55 (heroHeight - 100vh).
  // So every reveal must FINISH well before then, leaving a readable dwell
  // while still pinned. Globe settles by 0.34, copy is fully legible by 0.3.
  const globeScale = useTransform(
    scrollYProgress,
    [0, 0.34],
    [1.4, isDesktop ? 0.92 : 0.72],
  );
  const globeX = useTransform(
    scrollYProgress,
    [0, 0.34],
    ["0vw", isDesktop ? "25vw" : "0vw"],
  );
  const globeY = useTransform(
    scrollYProgress,
    [0, 0.34],
    ["0vh", isDesktop ? "0vh" : "-14vh"],
  );
  const globeGlow = useTransform(scrollYProgress, [0, 0.34], [1, 0.6]);

  // Copy: hidden on load, snaps to fully readable early and holds.
  const textOpacity = useTransform(scrollYProgress, [0.12, 0.3], [0, 1]);
  const textX = useTransform(
    scrollYProgress,
    [0.12, 0.34],
    [isDesktop ? -70 : 0, 0],
  );
  const textY = useTransform(
    scrollYProgress,
    [0.12, 0.34],
    [isDesktop ? 0 : 60, 0],
  );

  // Intro overlay + scroll hint fade out on first scroll.
  const introOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);

  return (
    <section ref={heroRef} className="relative h-[220vh]">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden px-6">
        {/* Aurora color field */}
        <motion.div
          aria-hidden
          style={{ opacity: globeGlow }}
          className="pointer-events-none absolute inset-0 -z-0 overflow-hidden"
        >
          <div className="aurora-1 absolute left-[8%] top-[18%] h-[420px] w-[420px] rounded-full bg-accent/20 blur-[110px]" />
          <div className="aurora-2 absolute left-[38%] top-[45%] h-[380px] w-[380px] rounded-full bg-[#ff4ecd]/12 blur-[120px]" />
          <div className="aurora-3 absolute right-[10%] top-[20%] h-[460px] w-[460px] rounded-full bg-accent-2/18 blur-[120px]" />
          <div className="aurora-1 absolute bottom-[5%] right-[30%] h-[320px] w-[320px] rounded-full bg-[#4ec9ff]/10 blur-[110px]" />
        </motion.div>

        {/* Dot grid backdrop */}
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

        <div className="relative z-10 mx-auto w-full max-w-7xl">
          {/* ── Copy (reveals on scroll) ── */}
          <motion.div
            style={{ opacity: textOpacity, x: textX, y: textY }}
            className="flex flex-col items-center text-center lg:max-w-[46%] lg:items-start lg:text-left"
          >
            <div className="flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-semibold text-accent backdrop-blur">
              <Clock className="size-3.5" />
              IST <IstClock /> · Built for Indian founders
            </div>

            <h1 className="mt-8 text-5xl font-extrabold leading-[1.03] tracking-tight text-foreground md:text-7xl">
              <SplitWords text="Plan, generate," delay={0} />
              <br />
              <span className="gradient-text">
                <SplitWords text="schedule & review." delay={0.08} />
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg font-medium text-foreground/85 md:text-xl">
              One place to write with AI, publish to LinkedIn, X, Telegram,
              Slack, Discord and Dev.to in a single click, and review every post
              on one IST calendar. Stop juggling six tabs.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              {waitlistMode ? (
                <WaitlistForm id="hero-waitlist" />
              ) : (
                <>
                  <ShimmerButton href="/register">
                    Start posting free
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </ShimmerButton>
                  <motion.a
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    href="#demo"
                    className="inline-flex items-center gap-2 rounded-full border border-line px-7 py-3.5 text-sm font-semibold text-foreground transition-colors hover:border-accent/60 hover:bg-card"
                  >
                    <Sparkles className="size-4 text-accent" />
                    Try the live demo
                  </motion.a>
                </>
              )}
            </div>

            <p className="mt-8 text-xs uppercase tracking-[0.25em] text-muted/70">
              No card needed · 6 channels live · 30+ on the way
            </p>
          </motion.div>

          {/* ── Icon globe (starts centered & huge, moves aside) ── */}
          <motion.div
            style={{ x: globeX, y: globeY, scale: globeScale }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div className="pointer-events-auto">
              {isDesktop ? (
                <IconGlobe size={520} iconSize={48} />
              ) : (
                <IconGlobe size={320} iconSize={40} />
              )}
            </div>
          </motion.div>
        </div>

        {/* Intro tagline overlay — only visible before the first scroll */}
        <motion.div
          style={{ opacity: introOpacity }}
          className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex flex-col items-center gap-3 text-center"
        >
          <span className="text-sm font-bold uppercase tracking-[0.35em] text-muted/80">
            plan · generate · schedule · review
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-9 w-5 items-start justify-center rounded-full border border-line/70 p-1.5"
          >
            <div className="h-2 w-1 rounded-full bg-accent" />
          </motion.div>
          <span className="text-xs text-muted/60">scroll to explore</span>
        </motion.div>
      </div>
    </section>
  );
}
