import { api } from "@/lib/api";
import { hourLabel, istParts, startOfDay } from "@/lib/calendar";
import { channelLabel } from "@/lib/platforms";
import { mediaKind } from "@postn/shared";

export type CalPostStatus = "published" | "scheduled" | "failed";
export type CalPlatform =
  | "TWITTER"
  | "LINKEDIN"
  | "LINKEDIN_PAGE"
  | "TELEGRAM"
  | "DEVTO"
  | "SLACK"
  | "DISCORD";

export type CalPost = {
  id: string;
  day: Date;
  hour: number;
  title: string;
  body: string;
  platforms: CalPlatform[];
  status: CalPostStatus;
  account: string;
  media?: string;
  mediaUrl?: string;
  mediaMime?: string;
  error?: string;
  at: string;
  canMove: boolean;
  canCancel: boolean;
  canRetry: boolean;
  canDelete: boolean;
};

export type SavedPost = {
  id: string;
  content: string;
  mediaUrls: string[];
  media?: Array<{ url: string; mimeType: string }>;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  failedReason: string | null;
  createdAt: string;
  targets: Array<{
    platform: string;
    status: string;
    failedReason: string | null;
  }>;
};

const PLATFORMS = new Set<CalPlatform>([
  "TWITTER",
  "LINKEDIN",
  "LINKEDIN_PAGE",
  "TELEGRAM",
  "DEVTO",
  "SLACK",
  "DISCORD",
]);

export async function fetchQueuePosts() {
  const data = await api<{ items: SavedPost[] }>("/posts?status=QUEUE");
  return data.items.map(toCalPost);
}

export function toCalPost(post: SavedPost): CalPost {
  const at = post.scheduledAt || post.publishedAt || post.createdAt;
  const parts = istParts(new Date(at));
  const first = post.content.split("\n").find((line) => line.trim())?.trim() ?? "";
  const platforms = [
    ...new Set(
      post.targets
        .map((target) => target.platform)
        .filter((platform): platform is CalPlatform =>
          PLATFORMS.has(platform as CalPlatform),
        ),
    ),
  ];
  const file = post.media?.[0];
  const kind = file ? mediaKind(file.mimeType) : null;
  const count = post.mediaUrls.length;
  let media: string | undefined;
  if (kind === "video") media = "Video";
  else if (kind === "gif") media = "GIF";
  else if (count > 1) media = `${count} photos`;
  else if (count === 1) media = "Photo";

  return {
    id: post.id,
    day: new Date(parts.year, parts.month - 1, parts.day),
    hour: parts.hour,
    title: first || (media ? `(${media.toLowerCase()} only)` : "(empty)"),
    body: post.content,
    platforms,
    status: calStatus(post),
    account: platforms.map(channelLabel).join(" · ") || "postN",
    media,
    mediaUrl: file?.url ?? post.mediaUrls[0],
    mediaMime: file?.mimeType,
    error: post.failedReason ?? undefined,
    at,
    canMove: post.status === "SCHEDULED",
    canCancel: post.status === "SCHEDULED",
    canRetry:
      post.status === "FAILED" ||
      post.targets.some((target) => target.status === "FAILED"),
    canDelete: post.status !== "PUBLISHING",
  };
}

export async function reschedulePost(id: string, scheduledAt: string) {
  return api<SavedPost>(`/posts/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ scheduledAt }),
  });
}

export async function cancelPost(id: string) {
  return api<SavedPost>(`/posts/${id}/cancel`, { method: "POST" });
}

export async function deletePost(id: string) {
  return api<{ ok: boolean }>(`/posts/${id}`, { method: "DELETE" });
}

export async function retryPost(id: string, platform?: string) {
  return api<SavedPost>(`/posts/${id}/retry`, {
    method: "POST",
    body: JSON.stringify(platform ? { platform } : {}),
  });
}

export function postsOnDay(posts: CalPost[], day: Date) {
  const t = startOfDay(day).getTime();
  return posts
    .filter((post) => startOfDay(post.day).getTime() === t)
    .sort((a, b) => a.hour - b.hour || a.id.localeCompare(b.id));
}

export function groupPostsByHour(posts: CalPost[]) {
  const map = new Map<number, CalPost[]>();
  for (const post of posts) {
    const list = map.get(post.hour) ?? [];
    list.push(post);
    map.set(post.hour, list);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}

export function stamp(post: CalPost) {
  return new Date(post.at).getTime();
}

export function whenLabel(post: CalPost, now: Date) {
  const same =
    post.day.toDateString() === startOfDay(now).toDateString()
      ? "Today"
      : post.day.toDateString() ===
          new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toDateString()
        ? "Tomorrow"
        : post.day.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });
  return `${same} · ${hourLabel(post.hour)}`;
}

export function formatCount(value: number) {
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function calStatus(post: SavedPost): CalPostStatus {
  if (
    post.status === "FAILED" ||
    post.targets.some((target) => target.status === "FAILED")
  ) {
    return "failed";
  }
  if (post.status === "PUBLISHED") return "published";
  return "scheduled";
}
