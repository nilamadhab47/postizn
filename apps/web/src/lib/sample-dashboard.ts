import { hourLabel } from "./calendar";
import {
  sampleCalendarPosts,
  type CalPlatform,
  type CalPost,
} from "./sample-calendar-posts";

export type PostMetrics = {
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
};

export type EnrichedPost = CalPost & { metrics: PostMetrics };

export type DashComment = {
  id: string;
  postId: string;
  platform: CalPlatform;
  author: string;
  handle: string;
  text: string;
  minutesAgo: number;
};

export type DashReaction = {
  id: string;
  kind: "like" | "view" | "share" | "bookmark";
  platform: CalPlatform;
  postId: string;
  actor: string;
  minutesAgo: number;
};

function stamp(post: CalPost) {
  const d = new Date(post.day);
  d.setHours(post.hour, 0, 0, 0);
  return d.getTime();
}

function n(id: string, min: number, span: number) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return min + (h >>> 0) % span;
}

function metricsFor(post: CalPost): PostMetrics {
  const linkedin = post.platforms.includes("linkedin");
  return {
    impressions: n(post.id, linkedin ? 2400 : 900, linkedin ? 6200 : 2800),
    likes: n(post.id + "l", linkedin ? 40 : 18, linkedin ? 180 : 90),
    comments: n(post.id + "c", 4, 28),
    shares: n(post.id + "s", 3, 40),
    clicks: n(post.id + "k", 20, 220),
  };
}

export function sampleDashboard(now = new Date()) {
  const posts = sampleCalendarPosts(now);
  const published = posts
    .filter((post) => post.status === "published")
    .sort((a, b) => stamp(b) - stamp(a))
    .map((post) => ({ ...post, metrics: metricsFor(post) }));
  const upcoming = posts
    .filter((post) => post.status === "scheduled")
    .sort((a, b) => stamp(a) - stamp(b));
  const failed = posts.filter((post) => post.status === "failed");

  const totals = published.reduce(
    (acc, post) => {
      acc.impressions += post.metrics.impressions;
      acc.likes += post.metrics.likes;
      acc.comments += post.metrics.comments;
      acc.shares += post.metrics.shares;
      acc.clicks += post.metrics.clicks;
      if (post.platforms.includes("linkedin")) {
        acc.linkedin += post.metrics.impressions;
      }
      if (post.platforms.includes("x")) acc.x += post.metrics.impressions;
      return acc;
    },
    {
      impressions: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      clicks: 0,
      linkedin: 0,
      x: 0,
    },
  );

  const spark = [0.42, 0.55, 0.48, 0.7, 0.62, 0.88, 1].map((weight, i) =>
    Math.round(totals.impressions * weight * (0.12 + i * 0.02)),
  );

  const comments: DashComment[] = [
    {
      id: "c1",
      postId: "y-morning-in",
      platform: "linkedin",
      author: "Priya Menon",
      handle: "priya.ops",
      text: "Where do you ship outside Odisha? We can take 40 jars in Kochi this week.",
      minutesAgo: 18,
    },
    {
      id: "c2",
      postId: "y-eve",
      platform: "x",
      author: "Rahul",
      handle: "rahul.ecom",
      text: "40 minutes is insane. What time is Sunday’s drop?",
      minutesAgo: 41,
    },
    {
      id: "c3",
      postId: "y-morning-x",
      platform: "x",
      author: "Ananya",
      handle: "ananya.eats",
      text: "In Bhubaneswar — already ordered. Packing pics please.",
      minutesAgo: 62,
    },
    {
      id: "c4",
      postId: "t-past",
      platform: "x",
      author: "Vikram",
      handle: "vik.warehouse",
      text: "Cuttack delay — same story last drop. Flag the courier, not the batch.",
      minutesAgo: 110,
    },
    {
      id: "c5",
      postId: "y-morning-in",
      platform: "linkedin",
      author: "Neha Kapoor",
      handle: "neha.d2c",
      text: "This is the kind of founder update buyers actually read. More of this.",
      minutesAgo: 155,
    },
  ];

  const reactions: DashReaction[] = [
    {
      id: "r1",
      kind: "like",
      platform: "linkedin",
      postId: "y-morning-in",
      actor: "Sana · buyer, Mumbai",
      minutesAgo: 4,
    },
    {
      id: "r2",
      kind: "view",
      platform: "linkedin",
      postId: "y-morning-in",
      actor: "12 profile visits from the drop post",
      minutesAgo: 9,
    },
    {
      id: "r3",
      kind: "bookmark",
      platform: "x",
      postId: "y-eve",
      actor: "Dev · D2C ops",
      minutesAgo: 14,
    },
    {
      id: "r4",
      kind: "share",
      platform: "x",
      postId: "y-eve",
      actor: "Reposted by @odisha.eats",
      minutesAgo: 27,
    },
    {
      id: "r5",
      kind: "like",
      platform: "x",
      postId: "t-past",
      actor: "Mira · Kirana, Cuttack",
      minutesAgo: 33,
    },
    {
      id: "r6",
      kind: "view",
      platform: "x",
      postId: "y-morning-x",
      actor: "890 impressions in the last hour",
      minutesAgo: 51,
    },
  ];

  return {
    posts,
    published,
    upcoming,
    failed,
    totals,
    spark,
    comments,
    reactions,
    next: upcoming[0] ?? null,
  };
}

export function formatCount(value: number) {
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function ago(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export function whenLabel(post: CalPost, now: Date) {
  const d = new Date(post.day);
  d.setHours(post.hour, 0, 0, 0);
  const same =
    d.toDateString() === now.toDateString()
      ? "Today"
      : d.toDateString() ===
          new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toDateString()
        ? "Tomorrow"
        : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });
  return `${same} · ${hourLabel(post.hour)}`;
}

export const REACTION_LABEL: Record<DashReaction["kind"], string> = {
  like: "Liked",
  view: "Viewed",
  share: "Shared",
  bookmark: "Saved",
};
