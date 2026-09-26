"use client";

import { Counter, Reveal } from "./motion-bits";

const STATS = [
  { to: 6, suffix: "", label: "channels, one composer" },
  { to: 100, suffix: "%", label: "IST-native scheduling" },
  { to: 30, suffix: "s", label: "from draft to every feed" },
  { to: 0, suffix: "", label: "copy-pastes ever again" },
];

const COLORS = ["#ffb020", "#8b6cff", "#ff4ecd", "#4ec9ff"];

export function Stats() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 py-24">
      <div
        aria-hidden
        className="aurora-1 pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-2/8 blur-[110px]"
      />
      <div className="rainbow-border relative grid gap-10 rounded-3xl p-12 backdrop-blur sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat, i) => (
          <Reveal key={stat.label} delay={i * 0.1} className="text-center">
            <div
              className="text-6xl font-extrabold tabular-nums md:text-7xl"
              style={{
                color: COLORS[i % COLORS.length],
                textShadow: `0 0 40px ${COLORS[i % COLORS.length]}66`,
              }}
            >
              <Counter to={stat.to} suffix={stat.suffix} />
            </div>
            <p className="mt-3 text-base text-muted">{stat.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
