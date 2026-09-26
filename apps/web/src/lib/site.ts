export const SITE_NAME = "postN";
export const SITE_TAGLINE = "Write once. Post everywhere.";
export const SITE_DESCRIPTION =
  "The social media scheduler for founders. Write once with AI, publish to LinkedIn, X, Telegram, Slack, Discord, Dev.to and more, and review everything on one calendar. No copy-paste, no tab-juggling.";
export const SITE_KEYWORDS = [
  "social media scheduler",
  "cross-posting tool",
  "post to all social media at once",
  "social media management",
  "content calendar",
  "AI social media posts",
  "LinkedIn scheduler",
  "X scheduler",
  "Twitter scheduler",
  "Telegram",
  "Slack",
  "Discord",
  "Dev.to",
  "Buffer alternative",
  "founders",
  "postN",
];

export const PRODUCTION_SITE_URL = "https://www.postind.xyz";

/** Server-only. Set SITE_URL on Vercel (plain Config, no NEXT_PUBLIC_). */
export const SITE_URL = (
  process.env.SITE_URL ||
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
export const LINKEDIN_URL = "https://www.linkedin.com/in/nilamadhabsenapati";

/**
 * Server-only. Production hides Sign in and shows the waitlist.
 * Override with WAITLIST_MODE=true|false (no NEXT_PUBLIC_ prefix).
 */
export const WAITLIST_MODE =
  process.env.WAITLIST_MODE != null
    ? process.env.WAITLIST_MODE === "true"
    : process.env.NODE_ENV === "production";
