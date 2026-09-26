"use client";

import { ReactLenis } from "lenis/react";
import { LandingNav } from "./landing-nav";
import { Hero } from "./hero";
import { ChannelMarquee } from "./channel-marquee";
import { LiveDemo } from "./live-demo";
import { Features } from "./features";
import { HowItWorks } from "./how-it-works";
import { Stats } from "./stats";
import { Faq } from "./faq";
import { CtaSection, LandingFooter } from "./cta-footer";

export function LandingPage({ waitlistMode }: { waitlistMode: boolean }) {
  return (
    <ReactLenis root options={{ lerp: 0.1, smoothWheel: true }}>
      <div className="relative min-h-screen overflow-x-clip bg-background text-foreground">
        <LandingNav waitlistMode={waitlistMode} />
        <Hero waitlistMode={waitlistMode} />
        <ChannelMarquee />
        <LiveDemo />
        <Features />
        <HowItWorks />
        <Stats />
        <Faq />
        <CtaSection waitlistMode={waitlistMode} />
        <LandingFooter waitlistMode={waitlistMode} />
      </div>
    </ReactLenis>
  );
}
