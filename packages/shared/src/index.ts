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
  NEWSLETTER: 100000,
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
  | "DISCORD"
  | "NEWSLETTER";

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
  mediaUrls?: string[];
  media?: PostMedia[];
  settings?: ChannelSettings;
};

export type PostMedia = {
  url: string;
  mimeType: string;
  bytes?: number;
  id?: string;
  sourceId?: string;
  sourceUrl?: string;
  alt?: string;
};

export type Post = {
  id: string;
  content: string;
  contentByPlatform: Record<string, string> | null;
  mediaUrls: string[];
  media?: PostMedia[];
  mediaByPlatform?: Record<string, PostMedia[]>;
  mediaAlt?: Record<string, string> | null;
  settingsByPlatform?: Record<string, ChannelSettings>;
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
export const MAX_ALT_TEXT = 1000;
export const MAX_FIRST_COMMENT = 1250;
export const MAX_NEWSLETTER_SUBJECT = 200;
export const MAX_NEWSLETTER_PREVIEW = 150;

export function cleanAltText(value?: string | null) {
  const text = (value ?? "").trim();
  if (!text) return undefined;
  return text.slice(0, MAX_ALT_TEXT);
}

export function cleanFirstComment(value?: string | null) {
  const text = (value ?? "").trim();
  if (!text) return undefined;
  return text.slice(0, MAX_FIRST_COMMENT);
}

export type MediaKind = "image" | "gif" | "video";

export type MediaRef = {
  url: string;
  mimeType: string;
  bytes: number;
  id?: string;
  sourceId?: string;
  sourceUrl?: string;
  alt?: string;
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
  if (hasVideo && selected.has("NEWSLETTER")) {
    return "Newsletter does not take video. Unselect Newsletter or drop the video.";
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

export const CROP_ASPECT_IDS = ["linkedin", "square", "x", "original", "custom"] as const;
export type CropAspectId = (typeof CROP_ASPECT_IDS)[number];

export type CropChip = {
  id: CropAspectId;
  label: string;
  /** Width / height. Omit for original image ratio. */
  ratio?: number;
  bakeWidth: number;
  bakeHeight: number;
};

export const CROP_CHIPS: CropChip[] = [
  { id: "linkedin", label: "LinkedIn", ratio: 1200 / 627, bakeWidth: 1200, bakeHeight: 627 },
  { id: "square", label: "Square", ratio: 1, bakeWidth: 1080, bakeHeight: 1080 },
  { id: "x", label: "X", ratio: 16 / 9, bakeWidth: 1600, bakeHeight: 900 },
  { id: "original", label: "Original", bakeWidth: 1600, bakeHeight: 1600 },
  { id: "custom", label: "Custom", bakeWidth: 1600, bakeHeight: 1600 },
];

export type CropRecipe = {
  aspect: CropAspectId;
  zoom: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  crop: { x: number; y: number; width: number; height: number };
};

export function isCropAspectId(value: string): value is CropAspectId {
  return (CROP_ASPECT_IDS as readonly string[]).includes(value);
}

export function cropChip(aspect: CropAspectId) {
  return CROP_CHIPS.find((row) => row.id === aspect) ?? CROP_CHIPS[1];
}

export function parseCropRecipe(raw: unknown): CropRecipe | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const aspect = String(row.aspect ?? "");
  if (!isCropAspectId(aspect)) return null;
  const box = row.crop;
  if (!box || typeof box !== "object") return null;
  const crop = box as Record<string, unknown>;
  const x = Number(crop.x);
  const y = Number(crop.y);
  const width = Number(crop.width);
  const height = Number(crop.height);
  const zoom = Number(row.zoom);
  const rotation = Number(row.rotation);
  if (![x, y, width, height, zoom, rotation].every(Number.isFinite)) return null;
  if (width < 1 || height < 1 || width > 40_000 || height > 40_000) return null;
  return {
    aspect,
    zoom,
    rotation,
    flipX: Boolean(row.flipX),
    flipY: Boolean(row.flipY),
    crop: { x, y, width, height },
  };
}

export function defaultCropAspect(platforms: string[]): CropAspectId {
  const set = new Set(platforms.map((p) => p.toUpperCase()));
  const linkedIn = set.has("LINKEDIN") || set.has("LINKEDIN_PAGE");
  const twitter = set.has("TWITTER");
  if (linkedIn && !twitter) return "linkedin";
  return "square";
}

export function looksLikeHeic(mimeType = "", fileName = "", buffer?: Uint8Array) {
  const mime = mimeType.split(";")[0].trim().toLowerCase();
  if (
    mime === "image/heic" ||
    mime === "image/heif" ||
    mime === "image/heic-sequence" ||
    mime === "image/heif-sequence"
  ) {
    return true;
  }
  if (/\.hei[cf]$/i.test(fileName)) return true;
  if (buffer && buffer.length >= 12) {
    const brand = String.fromCharCode(
      buffer[8] ?? 0,
      buffer[9] ?? 0,
      buffer[10] ?? 0,
      buffer[11] ?? 0,
    ).toLowerCase();
    return ["heic", "heix", "heif", "hevc", "hevx", "mif1", "msf1"].includes(brand);
  }
  return false;
}

export const X_REPLY_IDS = ["everyone", "following", "mentioned", "verified"] as const;
export type XReplySetting = (typeof X_REPLY_IDS)[number];

export const X_REPLY_OPTIONS: { id: XReplySetting; label: string }[] = [
  { id: "everyone", label: "Everyone" },
  { id: "following", label: "People you follow" },
  { id: "mentioned", label: "People you mention" },
  { id: "verified", label: "Verified" },
];

export const LINKEDIN_LAYOUT_IDS = ["images", "carousel"] as const;
export type LinkedInLayout = (typeof LINKEDIN_LAYOUT_IDS)[number];

export const LINKEDIN_LAYOUT_OPTIONS: { id: LinkedInLayout; label: string }[] = [
  { id: "images", label: "Images" },
  { id: "carousel", label: "Carousel" },
];

export type ChannelSettings = {
  reply?: XReplySetting;
  layout?: LinkedInLayout;
  firstComment?: string;
  firstCommentId?: string;
  subject?: string;
  preview?: string;
};

export function isXReplySetting(value: string): value is XReplySetting {
  return (X_REPLY_IDS as readonly string[]).includes(value);
}

export function isLinkedInLayout(value: string): value is LinkedInLayout {
  return (LINKEDIN_LAYOUT_IDS as readonly string[]).includes(value);
}

export function channelSettingsKind(platform: string) {
  const value = platform.toUpperCase();
  if (value === "TWITTER") return "reply" as const;
  if (value === "LINKEDIN" || value === "LINKEDIN_PAGE") return "layout" as const;
  if (value === "NEWSLETTER") return "newsletter" as const;
  return null;
}

export function cleanChannelSettings(platform: string, raw?: unknown): ChannelSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const row = raw as Record<string, unknown>;
  const kind = channelSettingsKind(platform);
  const next: ChannelSettings = {};
  if (kind === "reply") {
    const reply = String(row.reply ?? "");
    if (isXReplySetting(reply) && reply !== "everyone") next.reply = reply;
  }
  if (kind === "layout") {
    const layout = String(row.layout ?? "");
    if (isLinkedInLayout(layout) && layout !== "images") next.layout = layout;
    const firstComment = cleanFirstComment(
      typeof row.firstComment === "string" ? row.firstComment : "",
    );
    if (firstComment) next.firstComment = firstComment;
    const firstCommentId = String(row.firstCommentId ?? "").trim();
    if (firstCommentId) next.firstCommentId = firstCommentId.slice(0, 200);
  }
  if (kind === "newsletter") {
    const subject = String(row.subject ?? "").trim().slice(0, MAX_NEWSLETTER_SUBJECT);
    if (subject) next.subject = subject;
    const preview = String(row.preview ?? "").trim().slice(0, MAX_NEWSLETTER_PREVIEW);
    if (preview) next.preview = preview;
  }
  return next;
}

export function firstCommentPending(settings?: ChannelSettings) {
  return Boolean(settings?.firstComment && !settings.firstCommentId);
}

/** X API v2 `reply_settings`. Omit for everyone. */
export function xReplySettingsApi(reply?: string) {
  if (reply === "following") return "following" as const;
  if (reply === "mentioned") return "mentionedUsers" as const;
  if (reply === "verified") return "verified" as const;
  return undefined;
}


