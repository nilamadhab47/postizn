"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  CalendarClock,
  Clapperboard,
  House,
  Images,
  RefreshCcw,
  Share2,
  Shield,
  Sparkles,
  Timer,
  Type,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import {
  PLAN_WELCOME_EVENT,
  finishOnboarding,
  finishPlanWelcome,
  hasFinishedOnboarding,
  hasSeenPlanWelcome,
} from "@/lib/onboarding";
import type { AccessId } from "@/lib/api";
import { FeatureRow, WelcomeHero } from "@/components/onboarding/welcome-art";

type Step = "product" | "channel";

export function OnboardingHost() {
  const { user } = useAuth();
  const router = useRouter();
  const access = (user?.entitlements?.access ?? user?.plan ?? "TRIAL") as AccessId;
  const exempt = Boolean(user?.entitlements?.billingExempt);
  const channels = user?.setup?.channels ?? 0;
  const first = user?.name?.split(" ")[0] ?? "there";

  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [step, setStep] = useState<Step>("product");
  const [planOpen, setPlanOpen] = useState(false);
  const [paidPlan, setPaidPlan] = useState<"PRO" | "STUDIO">("PRO");

  useEffect(() => {
    if (!user) return;

    const paid = access === "PRO" || access === "STUDIO";
    if (paid && !exempt && !hasSeenPlanWelcome(user.id, access)) {
      setPaidPlan(access);
      setPlanOpen(true);
      setWelcomeOpen(false);
      return;
    }

    if (access === "FREE") {
      setWelcomeOpen(false);
      return;
    }

    const fresh = (() => {
      try {
        return sessionStorage.getItem("postn:fresh-account") === "1";
      } catch {
        return false;
      }
    })();
    const trialish = access === "TRIAL";
    if (
      !hasFinishedOnboarding(user.id) &&
      (fresh || (trialish && channels === 0))
    ) {
      setStep("product");
      setWelcomeOpen(true);
    }
  }, [user, access, exempt, channels]);

  useEffect(() => {
    function onPaid(event: Event) {
      const detail = (event as CustomEvent<{ plan?: string }>).detail;
      const plan = detail?.plan === "STUDIO" ? "STUDIO" : "PRO";
      setPaidPlan(plan);
      setWelcomeOpen(false);
      setPlanOpen(true);
    }
    window.addEventListener(PLAN_WELCOME_EVENT, onPaid);
    return () => window.removeEventListener(PLAN_WELCOME_EVENT, onPaid);
  }, []);

  function closeWelcome() {
    if (user) finishOnboarding(user.id);
    setWelcomeOpen(false);
  }

  function goConnect() {
    closeWelcome();
    router.push("/accounts?from=start");
  }

  function closePlan() {
    if (user) finishPlanWelcome(user.id, paidPlan);
    setPlanOpen(false);
  }

  const planCopy = useMemo(() => planWelcome(paidPlan), [paidPlan]);

  return (
    <>
      <Dialog
        open={welcomeOpen}
        onOpenChange={(open) => {
          if (!open) closeWelcome();
        }}
      >
        <DialogContent
          className="z-[90] gap-0 overflow-hidden border-accent/30 bg-card p-0 shadow-[0_0_80px_-16px_rgba(255,176,32,0.5)] sm:max-w-lg"
          overlayClassName="z-[90]"
          showCloseButton
        >
          <AnimatePresence mode="wait" initial={false}>
            {step === "product" ? (
              <motion.div
                key="product"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.22 }}
              >
                <WelcomeHero kind="trial" />
                <div className="px-5 pb-2 pt-5">
                  <DialogTitle className="text-2xl font-extrabold tracking-tight">
                    {first}, this is postN.
                  </DialogTitle>
                  <DialogDescription className="mt-2 text-sm font-semibold text-muted">
                    One composer for every feed you actually post to. Write once,
                    pick an IST time, schedule — LinkedIn and X today, the rest of
                    the grid when you go Pro.
                  </DialogDescription>
                  <ul className="mt-5 space-y-3">
                    <FeatureRow icon={Share2} delay={0.08}>
                      Live previews that look like LinkedIn and X, not a Google Doc.
                    </FeatureRow>
                    <FeatureRow icon={WandSparkles} delay={0.16}>
                      Claude in the composer — draft, shorten for X, hashtags.
                    </FeatureRow>
                    <FeatureRow icon={Images} delay={0.24}>
                      Images and video in the same post. Calendar in IST.
                    </FeatureRow>
                    <FeatureRow icon={Timer} delay={0.32}>
                      Fourteen days, no card. LinkedIn + X only until you upgrade.
                    </FeatureRow>
                  </ul>
                </div>
                <ModalActions>
                  <Button
                    variant="outline"
                    className="border-line bg-transparent hover:bg-card hover:text-foreground"
                    onClick={closeWelcome}
                  >
                    Skip for now
                  </Button>
                  <Button
                    className="bg-accent text-accent-fg hover:bg-accent/90"
                    onClick={() => setStep("channel")}
                  >
                    Next
                  </Button>
                </ModalActions>
              </motion.div>
            ) : (
              <motion.div
                key="channel"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.22 }}
              >
                <WelcomeHero kind="channel" />
                <div className="px-5 pb-2 pt-5">
                  <DialogTitle className="text-2xl font-extrabold tracking-tight">
                    Connect a channel
                  </DialogTitle>
                  <DialogDescription className="mt-2 text-sm font-semibold text-muted">
                    Trial starts with LinkedIn and X. Nothing publishes until one
                    of those is connected. Telegram, Slack, Discord, Dev.to, and
                    Pages wait for Pro.
                  </DialogDescription>
                  <ul className="mt-5 space-y-3">
                    <FeatureRow icon={Shield} delay={0.08}>
                      Connect takes you to LinkedIn or X OAuth — tokens stay on the API.
                    </FeatureRow>
                    <FeatureRow icon={House} delay={0.16}>
                      After that, Compose is unlocked. Home fills once a post is queued.
                    </FeatureRow>
                  </ul>
                </div>
                <ModalActions>
                  <Button
                    variant="outline"
                    className="border-line bg-transparent hover:bg-card hover:text-foreground"
                    onClick={closeWelcome}
                  >
                    I&apos;ll do this later
                  </Button>
                  <Button
                    className="bg-accent text-accent-fg hover:bg-accent/90"
                    onClick={goConnect}
                  >
                    Connect a channel
                  </Button>
                </ModalActions>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      <Dialog
        open={planOpen}
        onOpenChange={(open) => {
          if (!open) closePlan();
        }}
      >
        <DialogContent
          className="z-[90] gap-0 overflow-hidden border-accent/30 bg-card p-0 shadow-[0_0_80px_-16px_rgba(255,176,32,0.55)] sm:max-w-lg"
          overlayClassName="z-[90]"
          showCloseButton
        >
          <WelcomeHero kind={paidPlan === "STUDIO" ? "studio" : "pro"} />
          <div className="px-5 pb-2 pt-5">
            <DialogTitle className="text-2xl font-extrabold tracking-tight">
              {planCopy.title}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm font-semibold text-muted">
              {planCopy.lead}
            </DialogDescription>
            <ul className="mt-5 space-y-3">
              {planCopy.points.map((point, i) => (
                <FeatureRow key={point.text} icon={point.icon} delay={0.08 + i * 0.08}>
                  {point.text}
                </FeatureRow>
              ))}
            </ul>
          </div>
          <ModalActions>
            <Button
              variant="outline"
              className="border-line bg-transparent hover:bg-card hover:text-foreground"
              onClick={() => {
                closePlan();
                router.push("/compose");
              }}
            >
              Write a post
            </Button>
            <Button
              className="bg-accent text-accent-fg hover:bg-accent/90"
              onClick={() => {
                closePlan();
                router.push("/accounts");
              }}
            >
              Connect more channels
            </Button>
          </ModalActions>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ModalActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 flex flex-col-reverse gap-2 border-t border-line bg-sidebar/80 p-4 sm:flex-row sm:justify-end">
      {children}
    </div>
  );
}

function planWelcome(plan: "PRO" | "STUDIO") {
  if (plan === "STUDIO") {
    return {
      title: "Welcome to Studio.",
      lead: "Same composer, more generation. Video gen is flagged coming — everything below is live now.",
      points: [
        {
          icon: Share2,
          text: "Every live channel: LinkedIn, X, Telegram, Slack, Discord, Dev.to, and LinkedIn Page.",
        },
        {
          icon: RefreshCcw,
          text: "20 posts a day, 400 a month — enough for a brand that actually ships.",
        },
        {
          icon: Sparkles,
          text: "80 images and 150 Claude writes a month.",
        },
        {
          icon: CalendarClock,
          text: "Write once, override per channel, schedule in IST. Calendar and media library included.",
        },
        {
          icon: Clapperboard,
          text: "AI video when it ships lands here, not on Pro.",
        },
      ],
    };
  }
  return {
    title: "Welcome to Pro.",
    lead: "The trial grid is open. Here’s what you can do now that the card is on file.",
    points: [
      {
        icon: Share2,
        text: "Every live channel — LinkedIn, X, Telegram, Slack, Discord, Dev.to, and LinkedIn Page — from one draft.",
      },
      {
        icon: RefreshCcw,
        text: "8 posts a day, 150 a month. Failed targets retry on their own; the rest still go out.",
      },
      {
        icon: Sparkles,
        text: "20 images and 40 Claude writes a month, in the composer next to the draft.",
      },
      {
        icon: Type,
        text: "Per-channel copy so LinkedIn can be longer and X can stay under 280.",
      },
      {
        icon: CalendarClock,
        text: "Calendar in IST, media library, Schedule or Post now. Extra channels stay paused on Trial; they are live for you now.",
      },
    ],
  };
}
