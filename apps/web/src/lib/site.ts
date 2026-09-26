export const SITE_NAME = "postN";
export const SITE_TAGLINE = "Plan, generate, schedule & review.";
export const SITE_DESCRIPTION =
  "India-first social scheduler for founders and D2C brands. Write once, publish to LinkedIn, X, Telegram, Slack, Discord and Dev.to, and review every post on one IST calendar.";
export const SITE_KEYWORDS = [
  "social media scheduler",
  "India",
  "IST",
  "LinkedIn scheduler",
  "Twitter scheduler",
  "X scheduler",
  "Telegram",
  "Slack",
  "Discord",
  "Dev.to",
  "D2C",
  "founders",
  "AI social posts",
  "postN",
];

export const PRODUCTION_SITE_URL = "https://www.postind.xyz";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === "production" ? PRODUCTION_SITE_URL : "") ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "") ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
  "http://localhost:3000"
).replace(/\/$/, "");

export const X_HANDLE = "MadhabCoder";
export const CONTACT_EMAIL = "nilamadhab47@gmail.com";
export const GITHUB_URL = "https://github.com/nilamadhab47/postizn";
export const X_URL = `https://x.com/${X_HANDLE}`;

/**
 * Production hides Sign in / Start free and shows the waitlist.
 * Local `next dev` keeps auth. Override with NEXT_PUBLIC_WAITLIST_MODE=true|false.
 */
export const WAITLIST_MODE =
  process.env.NEXT_PUBLIC_WAITLIST_MODE != null
    ? process.env.NEXT_PUBLIC_WAITLIST_MODE === "true"
    : process.env.NODE_ENV === "production";
