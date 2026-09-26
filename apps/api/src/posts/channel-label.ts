import { Platform } from "@prisma/client";

export function channelLabel(platform: Platform) {
  switch (platform) {
    case Platform.TWITTER:
      return "X";
    case Platform.LINKEDIN:
      return "LinkedIn";
    case Platform.LINKEDIN_PAGE:
      return "LinkedIn Page";
    case Platform.TELEGRAM:
      return "Telegram";
    case Platform.DEVTO:
      return "Dev.to";
    case Platform.SLACK:
      return "Slack";
    case Platform.DISCORD:
      return "Discord";
    default:
      return platform;
  }
}
