import {
  PRO_LAUNCH_MONTHLY_INR,
  PRO_LIST_MONTHLY_INR,
  PRO_YEARLY_INR,
  STUDIO_MONTHLY_INR,
  TRIAL_DAYS,
  inr,
} from "./pricing";

export const FAQS: { q: string; a: string }[] = [
  {
    q: "Which platforms can I publish to?",
    a: "Right now postN publishes to LinkedIn, X, Telegram, Slack, Discord, Dev.to, and Newsletter — all from a single draft. Newsletter is your Resend audience, not a new ESP. Instagram, YouTube, Threads and more are on the way.",
  },
  {
    q: "What is LinkedIn first comment?",
    a: "On the LinkedIn tab you can add an optional first comment — the native “link in comments” line. After the post lands, postN comments on that URN. Leave it empty and nothing extra is posted.",
  },
  {
    q: "How does Newsletter work?",
    a: "Connect your Resend API key, audience, and from-address. Same composer as LinkedIn and X: subject and preview sit on the Newsletter tab, the body is the draft. Unsubscribe and deliverability stay with Resend. We don’t host your list.",
  },
  {
    q: "Is it really free to start?",
    a: `Yes for ${TRIAL_DAYS} days, no card — LinkedIn and X only. Then add a card for Pro at ${inr(PRO_LAUNCH_MONTHLY_INR)}/month launch (${inr(PRO_LIST_MONTHLY_INR)} list) or ${inr(PRO_YEARLY_INR)}/year. Studio is ${inr(STUDIO_MONTHLY_INR)}/month when you need more generation and AI video. There is no forever Free plan. GST extra later. postN never sees the card — Razorpay Subscriptions Checkout renews monthly or yearly. Card, not UPI.`,
  },
  {
    q: "Do you have coupon codes?",
    a: "Yes. POSTN30 stretches a live trial from 14 days to 30. POSTNPRO unlocks Pro for 14 days after the trial ends. Redeem in Settings → Have a code? They only work if you have never paid. One redemption per code per account.",
  },
  {
    q: "What about timezones?",
    a: "You pick times the way you think — 9:30 PM your time, not UTC math. postN stores everything in UTC internally and shows your timezone across the whole app, wherever you are.",
  },
  {
    q: "Can the AI write posts for me?",
    a: "Claude is built into the composer. Give it a rough idea and it drafts, rewrites, shortens for X, and adds hashtags — so you never start from a blank page.",
  },
  {
    q: "What happens if one channel fails?",
    a: "Each channel publishes independently with automatic retries. If one fails, the rest still go out, and you get a plain-language reason for the one that didn't.",
  },
  {
    q: "Can I attach images?",
    a: "Yes. Upload once and postN handles native image publishing for every channel — LinkedIn uploads, X media, Telegram photos, and more.",
  },
];
