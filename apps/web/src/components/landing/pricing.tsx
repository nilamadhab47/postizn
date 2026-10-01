"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/site";
import { PLANS, type BillingCycle } from "@/lib/pricing";
import { GlowCard, Reveal } from "./motion-bits";

export function Pricing({ waitlistMode }: { waitlistMode: boolean }) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const registerHref = waitlistMode ? "#waitlist" : "/register";
  const contactHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("postN Enterprise")}`;

  return (
    <section id="pricing" className="relative mx-auto max-w-7xl px-6 py-28">
      <Reveal className="text-center">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-accent">
          Pricing
        </p>
        <h2 className="mx-auto mt-4 max-w-3xl text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
          Quit the extra tabs.{" "}
          <span className="gradient-text">Keep every feed for ₹799.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted">
          Fourteen days on LinkedIn and X, no card. Then one composer for Slack,
          Telegram, Discord, Pages, and Dev.to — ₹999 on paper, ₹799 while we
          launch.
        </p>
      </Reveal>

      <Reveal delay={0.08} className="mt-10 flex justify-center">
        <div className="inline-flex rounded-full border border-line/60 bg-card/70 p-1">
          {(
            [
              { id: "monthly", label: "Monthly" },
              { id: "yearly", label: "Yearly" },
            ] as const
          ).map((tab) => {
            const on = cycle === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCycle(tab.id)}
                className={`rounded-full px-5 py-2 text-sm font-bold transition ${
                  on
                    ? "bg-accent text-accent-fg"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {tab.label}
                {tab.id === "yearly" ? (
                  <span className={`ml-2 text-[10px] font-extrabold uppercase tracking-wide ${on ? "text-accent-fg/80" : "text-accent"}`}>
                    2 months free
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </Reveal>

      <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan, i) => {
          const price = plan[cycle];
          const href = plan.href === "contact" ? contactHref : registerHref;
          const cta = waitlistMode ? plan.cta.waitlist : plan.cta.register;
          return (
            <Reveal key={plan.id} delay={i * 0.06} className="h-full">
              <GlowCard
                className={`flex h-full flex-col p-6 ${
                  plan.featured
                    ? "border-accent/70 shadow-[0_0_50px_-16px_rgba(255,176,32,0.55)]"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-muted">
                    {plan.name}
                  </p>
                  {plan.badge ? (
                    <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-accent-fg">
                      {plan.badge}
                    </span>
                  ) : null}
                </div>
                <p className="mt-5 flex flex-wrap items-end gap-2">
                  {price.was ? (
                    <span className="mb-1 text-lg text-muted/70 line-through">
                      {price.was}
                    </span>
                  ) : null}
                  <span className="text-4xl font-extrabold tracking-tight">
                    {price.price}
                  </span>
                  {price.period ? (
                    <span className="mb-1 text-sm text-muted">{price.period}</span>
                  ) : null}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted">{plan.blurb}</p>
                <ul className="mt-6 flex-1 space-y-3">
                  {plan.points.map((point) => (
                    <li key={point} className="flex gap-2.5 text-sm leading-snug">
                      <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={href}
                  className={`mt-8 inline-flex items-center justify-center rounded-full px-5 py-3 text-center text-sm font-bold transition ${
                    plan.featured
                      ? "bg-accent text-accent-fg hover:brightness-110"
                      : "border border-line/70 text-foreground hover:border-accent/60"
                  }`}
                >
                  {cta}
                </a>
              </GlowCard>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
