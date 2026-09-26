"use client";

import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Reveal } from "./motion-bits";
import { FAQS } from "@/lib/faqs";

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative mx-auto max-w-3xl px-6 py-28">
      <Reveal className="text-center">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-accent">
          FAQ
        </p>
        <h2 className="mt-4 text-5xl font-extrabold tracking-tight md:text-6xl">
          Questions, <span className="gradient-text">answered.</span>
        </h2>
      </Reveal>

      <div className="mt-14 space-y-3">
        {FAQS.map((item, i) => {
          const isOpen = open === i;
          return (
            <Reveal key={item.q} delay={i * 0.05}>
              <div
                className={`overflow-hidden rounded-2xl border bg-card/60 backdrop-blur transition-colors ${
                  isOpen ? "border-accent/50" : "border-line/60"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-lg font-bold text-foreground">{item.q}</span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className={`grid size-8 shrink-0 place-items-center rounded-full ${
                      isOpen ? "bg-accent text-accent-fg" : "bg-white/5 text-muted"
                    }`}
                  >
                    <Plus className="size-4" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
                    >
                      <p className="px-6 pb-6 text-base leading-relaxed text-muted">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
