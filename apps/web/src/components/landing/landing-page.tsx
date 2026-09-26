"use client";

import { LandingNav } from "./landing-nav";
import { Hero } from "./hero";
import { ChannelMarquee } from "./channel-marquee";
import { Features } from "./features";
import { HowItWorks } from "./how-it-works";
import { Stats } from "./stats";
import { Faq } from "./faq";
import { CtaSection, LandingFooter } from "./cta-footer";

export function LandingPage({ waitlistMode }: { waitlistMode: boolean }) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <LandingNav waitlistMode={waitlistMode} />
      <Hero waitlistMode={waitlistMode} />
      <ChannelMarquee />
      <Features />
      <HowItWorks />
      <Stats />
      <Faq />
      <CtaSection waitlistMode={waitlistMode} />
      <LandingFooter waitlistMode={waitlistMode} />
    </div>
  );
}
