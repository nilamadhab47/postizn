"use client";

import { ChannelIcon } from "@/components/accounts/channel-icons";

const CHANNELS = [
  { slug: "linkedin", label: "LinkedIn" },
  { slug: "twitter", label: "X" },
  { slug: "telegram", label: "Telegram" },
  { slug: "slack", label: "Slack" },
  { slug: "discord", label: "Discord" },
  { slug: "devto", label: "Dev.to" },
  { slug: "instagram", label: "Instagram · soon" },
  { slug: "youtube", label: "YouTube · soon" },
  { slug: "whatsapp", label: "WhatsApp · soon" },
];

function Row() {
  return (
    <div className="flex shrink-0 items-center gap-4 pr-4">
      {CHANNELS.map(({ slug, label }) => (
        <div
          key={slug}
          className="flex items-center gap-3 rounded-full border border-line/50 bg-card/60 px-6 py-3 backdrop-blur transition-all duration-300 hover:scale-105 hover:border-accent/70 hover:shadow-[0_0_24px_-4px_rgba(255,176,32,0.5)]"
        >
          <ChannelIcon slug={slug} className="size-8 rounded-md" />
          <span className="whitespace-nowrap text-base font-semibold text-foreground/80">{label}</span>
        </div>
      ))}
    </div>
  );
}

export function ChannelMarquee() {
  return (
    <section className="relative overflow-hidden border-y border-line/40 bg-sidebar/50 py-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-background to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-background to-transparent"
      />
      <div className="marquee-track flex w-max">
        <Row />
        <Row />
      </div>
    </section>
  );
}
