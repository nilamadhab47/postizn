export const PRODUCT_NAME = "postN";

export const FREE_ACCOUNT_LIMIT = 2;
export const FREE_POSTS_PER_MONTH = 30;

export const PLATFORM_CHAR_LIMITS = {
  TWITTER: 280,
  LINKEDIN: 3000,
  LINKEDIN_PAGE: 3000,
  TELEGRAM: 4096,
  DEVTO: 100000,
  SLACK: 40000,
  DISCORD: 2000,
} as const;

export function platformCharCount(platform: keyof typeof PLATFORM_CHAR_LIMITS, text: string) {
  if (platform === "TWITTER") {
    const weighted = text.replace(/https?:\/\/[^\s]+/gi, "x".repeat(23));
    return Array.from(weighted).length;
  }
  return Array.from(text).length;
}

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

export type Plan = "FREE" | "PRO" | "STUDIO";

export type Platform =
  | "TWITTER"
  | "LINKEDIN"
  | "LINKEDIN_PAGE"
  | "TELEGRAM"
  | "DEVTO"
  | "SLACK"
  | "DISCORD";

export type PostStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "PUBLISHING"
  | "PUBLISHED"
  | "FAILED";

export type User = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  plan: Plan;
  timezone: string;
};

export type SocialAccount = {
  id: string;
  platform: Platform;
  platformId: string;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
  isActive: boolean;
  isMock: boolean;
};

export type PostTarget = {
  id: string;
  platform: Platform;
  status: PostStatus;
  platformPostId: string | null;
  failedReason: string | null;
  publishedAt: string | null;
};

export type PostMedia = {
  url: string;
  mimeType: string;
  bytes?: number;
};

export type Post = {
  id: string;
  content: string;
  contentByPlatform: Record<string, string> | null;
  mediaUrls: string[];
  media?: PostMedia[];
  status: PostStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  failedReason: string | null;
  aiGenerated: boolean;
  createdAt: string;
  targets?: PostTarget[];
};

export const MAX_POST_MEDIA = 4;
export const MAX_STILL_BYTES = 10 * 1024 * 1024;
export const MAX_GIF_BYTES = 15 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_DISCORD_FILE_BYTES = 25 * 1024 * 1024;
export const MIN_VIDEO_SECONDS = 3;
export const MAX_VIDEO_SECONDS = 140;

export type MediaKind = "image" | "gif" | "video";

export type MediaRef = {
  url: string;
  mimeType: string;
  bytes: number;
};

export function mediaKind(mimeType: string): MediaKind | null {
  const mime = mimeType.split(";")[0].trim().toLowerCase();
  if (mime === "image/gif") return "gif";
  if (mime === "image/jpeg" || mime === "image/png" || mime === "image/webp") {
    return "image";
  }
  if (mime === "video/mp4") return "video";
  return null;
}

export function maxBytesForKind(kind: MediaKind) {
  if (kind === "video") return MAX_VIDEO_BYTES;
  if (kind === "gif") return MAX_GIF_BYTES;
  return MAX_STILL_BYTES;
}

export function guessMimeFromUrl(url: string) {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  if (path.endsWith(".mp4")) return "video/mp4";
  if (path.endsWith(".gif")) return "image/gif";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export function mediaBundleError(
  items: MediaRef[],
  platforms: string[],
): string | null {
  if (items.length > MAX_POST_MEDIA) {
    return "You can attach up to 4 photos";
  }
  const kinds = items.map((item) => mediaKind(item.mimeType));
  if (kinds.some((kind) => !kind)) {
    return "Use JPEG, PNG, WebP, GIF, or MP4";
  }
  const hasVideo = kinds.includes("video");
  const hasGif = kinds.includes("gif");
  const hasImage = kinds.includes("image");
  const exclusive = [hasVideo, hasGif, hasImage].filter(Boolean).length;
  if (exclusive > 1) {
    return "Use either photos, one GIF, or one video — not mixed";
  }
  if (hasVideo && items.length > 1) return "One video per post";
  if (hasGif && items.length > 1) return "One GIF per post";

  const selected = new Set(platforms.map((platform) => platform.toUpperCase()));
  if (hasVideo && selected.has("SLACK")) {
    return "Slack does not take video. Unselect Slack or drop the video.";
  }
  if (hasVideo && selected.has("DEVTO")) {
    return "Dev.to does not take video. Unselect Dev.to or drop the video.";
  }
  if (
    hasVideo &&
    selected.has("DISCORD") &&
    items[0] &&
    items[0].bytes > MAX_DISCORD_FILE_BYTES
  ) {
    return "Discord webhooks only take files under 25 MB";
  }
  return null;
}

export const PAID_PLANS = ["PRO", "STUDIO"] as const;
export type PaidPlanId = (typeof PAID_PLANS)[number];

export const BILLING_INTERVALS = ["monthly", "yearly"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const BILLING_CURRENCY = "INR";

export const BILLING_PROVIDERS = ["none", "razorpay", "stripe"] as const;
export type BillingProviderId = (typeof BILLING_PROVIDERS)[number];

/** Amounts in paise (INR × 100). Adapters pass this through unchanged. */
export const PAID_SKUS: Record<
  PaidPlanId,
  Record<BillingInterval, { amountPaise: number; listPaise: number }>
> = {
  PRO: {
    monthly: { amountPaise: 79900, listPaise: 99900 },
    yearly: { amountPaise: 799900, listPaise: 999900 },
  },
  STUDIO: {
    monthly: { amountPaise: 149900, listPaise: 149900 },
    yearly: { amountPaise: 1499900, listPaise: 1499900 },
  },
};

export function isPaidPlan(value: string): value is PaidPlanId {
  return (PAID_PLANS as readonly string[]).includes(value);
}

export function isBillingInterval(value: string): value is BillingInterval {
  return (BILLING_INTERVALS as readonly string[]).includes(value);
}

export function rupeesFromPaise(paise: number) {
  return paise / 100;
}

