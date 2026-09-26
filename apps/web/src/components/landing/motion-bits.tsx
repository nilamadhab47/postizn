"use client";

import {
  motion,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Scroll parallax: shifts children vertically as the element travels through
 * the viewport. Positive speed = moves up faster than scroll (foreground feel),
 * negative = lags behind (background feel).
 */
export function Parallax({
  children,
  speed = 0.3,
  className,
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [speed * 120, speed * -120]);
  const smooth = useSpring(y, { stiffness: 120, damping: 30, mass: 0.4 });
  return (
    <motion.div ref={ref} style={{ y: smooth }} className={className}>
      {children}
    </motion.div>
  );
}

/** Fade + rise into view on scroll. */
export function Reveal({
  children,
  delay = 0,
  y = 32,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Per-word staggered headline reveal. */
export function SplitWords({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const words = text.split(" ");
  return (
    <span className={className} aria-label={text}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden pb-1 align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: "110%", rotate: 4 }}
            animate={{ y: 0, rotate: 0 }}
            transition={{
              duration: 0.75,
              delay: delay + i * 0.055,
              ease: [0.21, 0.47, 0.32, 0.98],
            }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 ? "\u00A0" : null}
        </span>
      ))}
    </span>
  );
}

/** Number that counts up when scrolled into view. */
export function Counter({
  to,
  suffix = "",
  className,
  duration = 1.6,
}: {
  to: number;
  suffix?: string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const value = useMotionValue(0);
  const spring = useSpring(value, { duration: duration * 1000, bounce: 0 });
  const display = useTransform(spring, (v) =>
    `${Math.round(v).toLocaleString("en-IN")}${suffix}`,
  );

  useEffect(() => {
    if (inView) value.set(to);
  }, [inView, to, value]);

  return (
    <span ref={ref} className={className}>
      <motion.span>{display}</motion.span>
    </span>
  );
}

/** Gold shimmer CTA button. */
export function ShimmerButton({
  children,
  href,
  className,
}: {
  children: ReactNode;
  href: string;
  className?: string;
}) {
  return (
    <motion.a
      href={href}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      className={`group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-accent px-7 py-3.5 text-sm font-bold text-accent-fg shadow-[0_0_40px_-8px_rgba(255,176,32,0.7)] transition-shadow hover:shadow-[0_0_60px_-6px_rgba(255,176,32,0.95)] ${className ?? ""}`}
    >
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
      {children}
    </motion.a>
  );
}

/** Card that tilts toward the cursor and shows a glow that follows it. */
export function GlowCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const rx = useSpring(useTransform(my, [0, 100], [4, -4]), { stiffness: 200, damping: 24 });
  const ry = useSpring(useTransform(mx, [0, 100], [-4, 4]), { stiffness: 200, damping: 24 });

  return (
    <motion.div
      ref={ref}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onMouseMove={(e) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        mx.set(((e.clientX - rect.left) / rect.width) * 100);
        my.set(((e.clientY - rect.top) / rect.height) * 100);
      }}
      onMouseLeave={() => {
        mx.set(50);
        my.set(50);
      }}
      className={`group relative overflow-hidden rounded-3xl border border-line/60 bg-card/80 backdrop-blur ${className ?? ""}`}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: useTransform(
            [mx, my],
            ([x, y]) =>
              `radial-gradient(420px circle at ${x}% ${y}%, rgba(255,176,32,0.12), transparent 65%)`,
          ),
        }}
      />
      {children}
    </motion.div>
  );
}
