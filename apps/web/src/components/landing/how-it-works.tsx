"use client";

import { motion } from "motion/react";
import { Link2, PenLine, Rocket } from "lucide-react";
import { Reveal } from "./motion-bits";

const STEPS = [
  {
    icon: Link2,
    step: "01",
    title: "Connect your channels",
    body: "OAuth for LinkedIn and X, tokens for the rest. Two minutes, all six connected.",
  },
  {
    icon: PenLine,
    step: "02",
    title: "Write once, tweak per feed",
    body: "One draft with live previews. Let Claude shorten for X or draft the whole thing.",
  },
  {
    icon: Rocket,
    step: "03",
    title: "Schedule and forget",
    body: "Pick your IST slot. The queue publishes on the dot and notifies you the moment it lands.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative border-y border-line/40 bg-sidebar/40 py-28">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-accent">
            How it works
          </p>
          <h2 className="mt-4 text-5xl font-extrabold tracking-tight md:text-6xl">
            Three steps to <span className="gradient-text-gold">every feed.</span>
          </h2>
        </Reveal>

        <div className="relative mt-16 grid gap-10 md:grid-cols-3">
          {/* Connecting line */}
          <motion.div
            aria-hidden
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.4, ease: "easeInOut" }}
            className="absolute left-[16%] right-[16%] top-9 hidden h-px origin-left bg-gradient-to-r from-accent via-accent-2 to-accent md:block"
          />

          {STEPS.map((item, i) => (
            <Reveal key={item.step} delay={i * 0.15} className="relative">
              <div className="flex flex-col items-center text-center">
                <motion.div
                  whileHover={{ scale: 1.12, rotate: 6 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="relative z-10 flex size-[72px] items-center justify-center rounded-3xl border border-line/60 bg-card shadow-[0_0_40px_-12px_rgba(255,176,32,0.5)]"
                >
                  <item.icon className="size-7 text-accent" />
                </motion.div>
                <span className="mt-5 font-mono text-xs font-bold tracking-widest text-accent-2">
                  {item.step}
                </span>
                <h3 className="mt-2 text-xl font-bold">{item.title}</h3>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
                  {item.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
