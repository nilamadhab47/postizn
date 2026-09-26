"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight, Mail } from "lucide-react";
import { useRef } from "react";
import { ChannelIcon } from "@/components/accounts/channel-icons";
import { IconGlobe } from "./icon-globe";
import { useIsDesktop } from "./hero";
import { ShimmerButton } from "./motion-bits";
import { WaitlistForm } from "./waitlist-form";

const GITHUB_URL = "https://github.com/nilamadhab47/postizn";
const X_URL = "https://x.com/MadhabCoder";
const EMAIL = "nilamadhab47@gmail.com";

function XGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

function GithubGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.13-.3-.54-1.53.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.65.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.23 0 4.63-2.81 5.65-5.49 5.95.43.37.82 1.1.82 2.22v3.29c0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z" />
    </svg>
  );
}

function CtaCopy({ waitlistMode }: { waitlistMode: boolean }) {
  return (
    <>
      <h2 className="text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
        Your next post deserves{" "}
        <span className="gradient-text">every feed.</span>
      </h2>
      <p className="mt-6 max-w-lg text-lg text-muted">
        {waitlistMode
          ? "36 networks on that globe — six live today, the rest on the way. Drop your email and be first in when postN opens."
          : "Stop rewriting the same update six times. Start free — no card, no trial countdown, just posting."}
      </p>
      <div className="mt-9 flex w-full justify-center lg:justify-start">
        {waitlistMode ? (
          <WaitlistForm id="cta-waitlist" />
        ) : (
          <ShimmerButton href="/register" className="px-10 py-4 text-base">
            Get started free
            <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
          </ShimmerButton>
        )}
      </div>
      <div className="mt-10 flex items-center justify-center gap-3 lg:justify-start">
        {["linkedin", "twitter", "telegram", "slack", "discord", "devto"].map(
          (slug, i) => (
            <motion.div
              key={slug}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.08 }}
              whileHover={{ y: -6, scale: 1.15 }}
            >
              <ChannelIcon slug={slug} className="size-8 rounded-lg" />
            </motion.div>
          ),
        )}
      </div>
    </>
  );
}

export function CtaSection({ waitlistMode }: { waitlistMode: boolean }) {
  const isDesktop = useIsDesktop();
  const ref = useRef<HTMLDivElement>(null);

  // Pinned finale: the globe loads huge and centered, then shrinks to the
  // right while the closing pitch slides in from the left. All transforms
  // finish inside the pinned range (offset "end end").
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const globeScale = useTransform(scrollYProgress, [0.05, 0.45], [1.25, 0.95]);
  const globeX = useTransform(scrollYProgress, [0.05, 0.45], ["0vw", "24vw"]);
  const textOpacity = useTransform(scrollYProgress, [0.2, 0.45], [0, 1]);
  const textX = useTransform(scrollYProgress, [0.2, 0.48], [-70, 0]);
  const introOpacity = useTransform(scrollYProgress, [0, 0.14], [1, 0]);

  if (!isDesktop) {
    // Mobile: static — heading and form first, globe below.
    return (
      <section id="waitlist" className="relative overflow-hidden px-6 py-28">
        <CtaAurora />
        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
          <CtaCopy waitlistMode={waitlistMode} />
          <div className="mt-12">
            <IconGlobe size={300} iconSize={36} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} id="waitlist" className="relative h-[240vh]">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden px-6">
        <CtaAurora />

        <div className="relative z-10 mx-auto w-full max-w-7xl">
          {/* Copy slides in from the left */}
          <motion.div
            style={{ opacity: textOpacity, x: textX }}
            className="flex flex-col items-start text-left lg:max-w-[46%]"
          >
            <CtaCopy waitlistMode={waitlistMode} />
          </motion.div>

          {/* Globe: centered → right */}
          <motion.div
            style={{ x: globeX, scale: globeScale }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div className="pointer-events-auto">
              <IconGlobe size={480} iconSize={44} />
            </div>
          </motion.div>
        </div>

        {/* Intro line — visible while the globe is alone */}
        <motion.div
          style={{ opacity: introOpacity }}
          className="pointer-events-none absolute inset-x-0 bottom-14 z-20 flex flex-col items-center gap-2 text-center"
        >
          <span className="text-sm font-bold uppercase tracking-[0.35em] text-muted/80">
            36 networks · one postN
          </span>
          <span className="text-xs text-muted/60">keep scrolling</span>
        </motion.div>
      </div>
    </section>
  );
}

function CtaAurora() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="aurora-1 absolute left-1/4 top-1/3 h-[420px] w-[520px] rounded-full bg-accent/14 blur-[120px]" />
      <div className="aurora-2 absolute right-1/4 top-1/2 h-[360px] w-[420px] rounded-full bg-[#ff4ecd]/10 blur-[120px]" />
      <div className="aurora-3 absolute bottom-0 left-1/2 h-[300px] w-[400px] -translate-x-1/2 rounded-full bg-accent-2/14 blur-[110px]" />
    </div>
  );
}

export function LandingFooter({ waitlistMode }: { waitlistMode: boolean }) {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line/40 bg-sidebar/60">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <a href="/" className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.png" alt="postN" width={28} height={28} className="rounded-lg" />
              <span className="text-xl font-extrabold tracking-tight">
                post<span className="text-accent">N</span>
              </span>
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              India-first social scheduler. Write once, publish everywhere, and
              schedule in IST. Made for founders and D2C brands 🇮🇳
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="grid size-9 place-items-center rounded-xl border border-line/60 text-muted transition-colors hover:border-accent/60 hover:text-foreground"
              >
                <GithubGlyph className="size-4" />
              </a>
              <a
                href={X_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X"
                className="grid size-9 place-items-center rounded-xl border border-line/60 text-muted transition-colors hover:border-accent/60 hover:text-foreground"
              >
                <XGlyph className="size-3.5" />
              </a>
              <a
                href={`mailto:${EMAIL}`}
                aria-label="Email"
                className="grid size-9 place-items-center rounded-xl border border-line/60 text-muted transition-colors hover:border-accent/60 hover:text-foreground"
              >
                <Mail className="size-4" />
              </a>
            </div>
          </div>

          {/* Product */}
          <FooterCol
            title="Product"
            links={[
              { label: "Features", href: "/#features" },
              { label: "Live demo", href: "/#demo" },
              { label: "How it works", href: "/#how" },
              { label: "FAQ", href: "/#faq" },
            ]}
          />

          {waitlistMode ? (
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-[0.18em] text-foreground/70">
                Waitlist
              </h3>
              <p className="mt-4 text-sm text-muted">
                Be first when we open. One email, no spam.
              </p>
              <div className="mt-4">
                <WaitlistForm size="sm" id="footer-waitlist" />
              </div>
            </div>
          ) : (
            <FooterCol
              title="Account"
              links={[
                { label: "Sign in", href: "/login" },
                { label: "Start free", href: "/register" },
              ]}
            />
          )}

          {/* Legal */}
          <FooterCol
            title="Legal"
            links={[
              { label: "Terms & conditions", href: "/terms" },
              { label: "Privacy policy", href: "/privacy" },
              { label: "Contact", href: `mailto:${EMAIL}` },
            ]}
          />
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-line/40 pt-6 text-sm text-muted md:flex-row">
          <p>© {year} postN. All rights reserved.</p>
          <p>
            Built by{" "}
            <a
              href={X_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground/80 transition-colors hover:text-accent"
            >
              @MadhabCoder
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="text-xs font-extrabold uppercase tracking-[0.18em] text-foreground/70">
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              className="text-sm text-muted transition-colors hover:text-accent"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
