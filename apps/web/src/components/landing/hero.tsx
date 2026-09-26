"use client";

import { motion } from "motion/react";
import { ArrowRight, Clock, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
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

  return (
    <section className="relative flex min-h-screen items-center overflow-hidden px-6 pb-16 pt-28">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="aurora-1 absolute left-[8%] top-[18%] h-[420px] w-[420px] rounded-full bg-accent/20 blur-[110px]" />
        <div className="aurora-2 absolute left-[38%] top-[45%] h-[380px] w-[380px] rounded-full bg-[#ff4ecd]/12 blur-[120px]" />
        <div className="aurora-3 absolute right-[10%] top-[20%] h-[460px] w-[460px] rounded-full bg-accent-2/18 blur-[120px]" />
        <div className="aurora-1 absolute bottom-[5%] right-[30%] h-[320px] w-[320px] rounded-full bg-[#4ec9ff]/10 blur-[110px]" />
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

      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
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
            One place to write with AI, publish to LinkedIn, X, Telegram, Slack,
            Discord and Dev.to in a single click, and review every post on one
            IST calendar. Stop juggling six tabs.
          </p>

          <div className="mt-9 flex w-full flex-wrap items-center justify-center gap-4 lg:justify-start">
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
        </div>

        <div className="flex justify-center lg:justify-end">
          {isDesktop ? (
            <IconGlobe size={480} iconSize={44} />
          ) : (
            <IconGlobe size={300} iconSize={36} />
          )}
        </div>
      </div>
    </section>
  );
}
