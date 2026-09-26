"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { AppHeader } from "@/components/layout/app-header";

type Target = {
  platform: string;
  status: string;
  failedReason: string | null;
};

type SavedPost = {
  id: string;
  content: string;
  mediaUrls: string[];
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  failedReason: string | null;
  jobId: string | null;
  createdAt: string;
  targets: Target[];
};

const STATUSES = ["DRAFT", "SCHEDULED", "PUBLISHED", "FAILED"] as const;

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Drafts",
  SCHEDULED: "Scheduled",
  PUBLISHED: "Published",
  FAILED: "Failed",
};

export function PostsBoard() {
  const router = useRouter();
  const search = useSearchParams();
  const initial = (search.get("status") ?? "DRAFT").toUpperCase();
  const [status, setStatus] = useState(
    STATUSES.includes(initial as (typeof STATUSES)[number]) ? initial : "DRAFT",
  );
  const [items, setItems] = useState<SavedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const query = useMemo(() => `/posts?status=${status}`, [status]);

  useEffect(() => {
    setLoading(true);
    void api<{ items: SavedPost[] }>(query)
      .then((data) => setItems(data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [query]);

  function pick(next: string) {
    setStatus(next);
    router.replace(`/posts?status=${next}`);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <AppHeader title="Posts" action={{ href: "/compose", label: "New post" }} />
      <div className="flex gap-1 border-b border-line px-5 py-3">
        {STATUSES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => pick(item)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              status === item
                ? "bg-accent text-accent-fg"
                : "text-muted hover:text-foreground"
            }`}
          >
            {STATUS_LABEL[item]}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {loading ? (
          <p className="text-sm font-semibold text-muted">Loading posts…</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
            <p className="text-xl font-bold">No {STATUS_LABEL[status].toLowerCase()} yet</p>
            <p className="mt-2 text-base text-muted">
              {status === "DRAFT"
                ? "Save draft from Compose and it lands here."
                : "Compose a post, then schedule or publish it."}
            </p>
            <Link
              href="/compose"
              className="mt-5 inline-block rounded-xl bg-accent px-4 py-2 text-sm font-bold text-accent-fg"
            >
              Open compose
            </Link>
          </div>
        ) : (
          <ul className="grid gap-3">
            {items.map((post) => (
              <li key={post.id}>
                <Link
                  href={
                    post.status === "DRAFT"
                      ? `/compose?post=${post.id}`
                      : `/compose?post=${post.id}`
                  }
                  className="flex gap-4 rounded-2xl border border-line bg-card p-4 hover:border-accent"
                >
                  {post.mediaUrls[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.mediaUrls[0]}
                      alt=""
                      className="size-20 shrink-0 rounded-xl object-cover"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">
                      {whenCopy(post)} · {post.targets.map(platformLabel).join(" + ") || "no channel"}
                    </p>
                    <p className="mt-1 line-clamp-3 text-sm font-semibold">
                      {post.content || "(image only)"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {post.targets.map((target) => (
                        <span
                          key={target.platform}
                          className="rounded-md border border-line px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted"
                        >
                          {platformLabel(target)} {target.status.toLowerCase()}
                        </span>
                      ))}
                    </div>
                    {post.failedReason ? (
                      <p className="mt-1 text-xs font-semibold text-today">{post.failedReason}</p>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function whenCopy(post: SavedPost) {
  const raw = post.scheduledAt || post.publishedAt || post.createdAt;
  const stamp = new Date(raw).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
  if (post.status === "SCHEDULED") return `Queued · ${stamp}`;
  if (post.status === "PUBLISHING") return `Sending · ${stamp}`;
  return stamp;
}

function platformLabel(target: Target) {
  switch (target.platform) {
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
      return target.platform;
  }
}
