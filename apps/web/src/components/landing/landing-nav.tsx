"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { WAITLIST_MODE } from "@/lib/site";

const LINKS = [
  { label: "Demo", href: "#demo" },
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "FAQ", href: "#faq" },
];

export function LandingNav() {
  const { scrollY } = useScroll();
  const bg = useTransform(scrollY, [0, 120], ["rgba(20,16,31,0)", "rgba(20,16,31,0.85)"]);
  const border = useTransform(scrollY, [0, 120], ["rgba(74,63,99,0)", "rgba(74,63,99,0.6)"]);

  return (
    <motion.header
      style={{ backgroundColor: bg, borderColor: border }}
      className="fixed inset-x-0 top-0 z-50 border-b backdrop-blur-md"
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="postN" width={32} height={32} className="rounded-xl" />
          <span className="text-2xl font-extrabold tracking-tight">
            post<span className="text-accent">N</span>
          </span>
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-2 text-sm text-muted transition-colors hover:bg-card hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {WAITLIST_MODE ? (
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              href="#waitlist"
              className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-accent-fg"
            >
              Join the waitlist
            </motion.a>
          ) : (
            <>
              <a
                href="/login"
                className="rounded-full px-4 py-2 text-sm text-muted transition-colors hover:text-foreground"
              >
                Sign in
              </a>
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                href="/register"
                className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-accent-fg"
              >
                Start free
              </motion.a>
            </>
          )}
        </div>
      </nav>
    </motion.header>
  );
}
