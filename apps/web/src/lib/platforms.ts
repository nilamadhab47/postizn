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

export function formatIst(raw: string | null | undefined) {
  if (!raw) return "—";
  return new Date(raw).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
