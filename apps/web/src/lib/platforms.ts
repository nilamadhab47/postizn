import { DEFAULT_TIMEZONE } from "@postn/shared";

export function channelLabel(platform: string) {
  switch (platform) {
    case "TWITTER":
      return "X";
    case "LINKEDIN":
      return "LinkedIn";
    case "LINKEDIN_PAGE":
      return "LinkedIn Page";
    case "TELEGRAM":
      return "Telegram";
    case "DEVTO":
      return "Dev.to";
    case "SLACK":
      return "Slack";
    case "DISCORD":
      return "Discord";
    default:
      return platform;
  }
}

export function platformSlug(platform: string) {
  switch (platform) {
    case "TWITTER":
      return "twitter";
    case "LINKEDIN":
      return "linkedin";
    case "LINKEDIN_PAGE":
      return "linkedin-page";
    case "TELEGRAM":
      return "telegram";
    case "DEVTO":
      return "devto";
    case "SLACK":
      return "slack";
    case "DISCORD":
      return "discord";
    default:
      return platform.toLowerCase().replace(/_/g, "-");
  }
}

export function formatIst(raw: string | null | undefined) {
  if (!raw) return "—";
  return new Date(raw).toLocaleString("en-IN", {
    timeZone: DEFAULT_TIMEZONE,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
