import { PAID_SKUS, rupeesFromPaise } from "@postn/shared";

export const TRIAL_DAYS = 14;

export const PRO_LIST_MONTHLY_INR = rupeesFromPaise(PAID_SKUS.PRO.monthly.listPaise);
export const PRO_LAUNCH_MONTHLY_INR = rupeesFromPaise(PAID_SKUS.PRO.monthly.amountPaise);
export const PRO_LIST_YEARLY_INR = rupeesFromPaise(PAID_SKUS.PRO.yearly.listPaise);
export const PRO_LAUNCH_YEARLY_INR = rupeesFromPaise(PAID_SKUS.PRO.yearly.amountPaise);

export const STUDIO_MONTHLY_INR = rupeesFromPaise(PAID_SKUS.STUDIO.monthly.amountPaise);
export const STUDIO_YEARLY_INR = rupeesFromPaise(PAID_SKUS.STUDIO.yearly.amountPaise);

/** What we actually charge at launch. */
export const PRO_MONTHLY_INR = PRO_LAUNCH_MONTHLY_INR;
export const PRO_YEARLY_INR = PRO_LAUNCH_YEARLY_INR;

export function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export type BillingCycle = "monthly" | "yearly";

export type PublicPlan = {
  id: "trial" | "pro" | "studio" | "enterprise";
  name: string;
  featured?: boolean;
  badge?: string;
  blurb: string;
  cta: { register: string; waitlist: string; contact?: string };
  href: "register" | "contact";
  monthly: { price: string; period: string; was?: string };
  yearly: { price: string; period: string; was?: string };
  points: string[];
};

export const PLANS: PublicPlan[] = [
  {
    id: "trial",
    name: "Trial",
    badge: "No card",
    blurb: "LinkedIn and X for 14 days. One shot per account.",
    href: "register",
    cta: { register: "Start 14-day trial", waitlist: "Join the waitlist" },
    monthly: { price: inr(0), period: "14 days" },
    yearly: { price: inr(0), period: "14 days" },
    points: [
      "LinkedIn + X only",
      "2 posts / day · 20 posts in the window",
      "3 images · 8 Claude writes",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    featured: true,
    badge: "Launch price",
    blurb: "Add a card. Unlock the rest of the grid and higher limits.",
    href: "register",
    cta: { register: "Start trial, then Pro", waitlist: "Join the waitlist" },
    monthly: {
      price: inr(PRO_LAUNCH_MONTHLY_INR),
      period: "/ month",
      was: inr(PRO_LIST_MONTHLY_INR),
    },
    yearly: {
      price: inr(PRO_LAUNCH_YEARLY_INR),
      period: "/ year",
      was: inr(PRO_LIST_YEARLY_INR),
    },
    points: [
      "Every live channel · Page, Telegram, Slack, Discord, Dev.to and more",
      "8 posts / day · 150 / month",
      "20 images · 40 Claude writes / month",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    blurb: "More generation now. AI video when it ships.",
    href: "register",
    cta: { register: "Start trial, then Studio", waitlist: "Join the waitlist" },
    monthly: { price: inr(STUDIO_MONTHLY_INR), period: "/ month" },
    yearly: { price: inr(STUDIO_YEARLY_INR), period: "/ year" },
    points: [
      "Everything in Pro",
      "20 posts / day · 400 / month",
      "80 images · 150 Claude writes / month",
      "AI video generation · coming",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    blurb: "Unlimited usage and custom integrations for teams.",
    href: "contact",
    cta: {
      register: "Talk to us",
      waitlist: "Talk to us",
      contact: "Talk to us",
    },
    monthly: { price: "Custom", period: "" },
    yearly: { price: "Custom", period: "" },
    points: [
      "Unlimited posts, images, and Claude writes",
      "Custom channel integrations",
      "Dedicated onboarding and SLA",
    ],
  },
];
