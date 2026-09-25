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

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

export type Plan = "FREE" | "PRO";

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

export type Post = {
  id: string;
  content: string;
  mediaUrls: string[];
  status: PostStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  failedReason: string | null;
  aiGenerated: boolean;
  createdAt: string;
};
