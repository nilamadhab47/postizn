"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { composeHref, hourLabel } from "@/lib/calendar";
import type { CalPlatform, CalPost, CalPostStatus } from "@/lib/sample-calendar-posts";

const STAMP: Record<CalPostStatus, string> = {
  published: "Posted",
  scheduled: "Queued",
  failed: "Failed",
};

const BAR: Record<CalPostStatus, string> = {
  published: "bg-[#6fbf62]",
  scheduled: "bg-accent",
  failed: "bg-today",
};

const TONE: Record<CalPostStatus, string> = {
  published: "bg-[#243326] text-[#d4f0c8]",
  scheduled: "bg-accent/15 text-accent",
  failed: "bg-today/15 text-today",
};

const PILL: Record<CalPostStatus, string> = {
  published: "bg-[#6fbf62] text-[#102010]",
  scheduled: "bg-accent text-accent-fg",
  failed: "bg-today text-white",
};

export function PlatformMark({ platform }: { platform: CalPlatform }) {
  return (
    <span
      className={`rounded px-1 text-[9px] font-extrabold ${
        platform === "linkedin"
          ? "bg-[#7aa2ff] text-[#0b1a3a]"
          : "bg-foreground text-background"
      }`}
    >
      {platform === "linkedin" ? "in" : "X"}
    </span>
  );
}

export function PostCard({
  post,
  compact,
  onOpen,
}: {
  post: CalPost;
  compact?: boolean;
  onOpen: (post: CalPost) => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onOpen(post);
      }}
      className={`flex h-full min-h-0 w-full overflow-hidden rounded-xl text-left shadow-[0_8px_18px_-12px_rgba(0,0,0,0.7)] ${TONE[post.status]}`}
    >
      <i className={`w-1.5 shrink-0 ${BAR[post.status]}`} />
      <div className="flex min-w-0 flex-1 flex-col justify-center px-2 py-1">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate text-[10px] font-extrabold uppercase tracking-wide">
            {hourLabel(post.hour)} · {STAMP[post.status]}
          </span>
          <span className="flex gap-1">
            {post.platforms.map((platform) => (
              <PlatformMark key={platform} platform={platform} />
            ))}
          </span>
        </div>
        {compact ? null : (
          <p className="mt-0.5 truncate text-[12px] font-semibold leading-tight text-foreground">
            {post.title}
          </p>
        )}
      </div>
    </button>
  );
}

export function HourCluster({
  posts,
  onOpen,
  onOpenHour,
}: {
  posts: CalPost[];
  onOpen: (post: CalPost, queue: CalPost[]) => void;
  onOpenHour: (posts: CalPost[]) => void;
}) {
  if (posts.length === 1) {
    return <PostCard post={posts[0]} onOpen={(post) => onOpen(post, posts)} />;
  }

  if (posts.length === 2) {
    return (
      <div className="flex h-full flex-col gap-1">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            compact
            onOpen={(item) => onOpen(item, posts)}
          />
        ))}
      </div>
    );
  }

  const extra = posts.length - 1;
  return (
    <div className="flex h-full flex-col gap-1">
      <div className="min-h-0 flex-1">
        <PostCard post={posts[0]} compact onOpen={(post) => onOpen(post, posts)} />
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onOpenHour(posts);
        }}
        className="flex h-6 shrink-0 items-center justify-between rounded-lg bg-foreground/10 px-2 text-[10px] font-extrabold uppercase tracking-wide text-foreground hover:bg-accent hover:text-accent-fg"
      >
        +{extra} more in this hour
        <span className="flex gap-0.5">
          {posts.slice(1, 4).map((post) => (
            <PlatformMark key={post.id} platform={post.platforms[0]} />
          ))}
        </span>
      </button>
    </div>
  );
}

export function DaySheet({
  day,
  posts,
  onClose,
  onOpen,
}: {
  day: Date;
  posts: CalPost[];
  onClose: () => void;
  onOpen: (post: CalPost, queue: CalPost[]) => void;
}) {
  const label = day.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  return (
    <Overlay onClose={onClose}>
      <div className="flex max-h-[min(720px,86vh)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-line bg-card shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">
              {posts.length} posts
            </p>
            <h2 className="text-2xl font-extrabold tracking-tight">{label}</h2>
          </div>
          <CloseButton onClick={onClose} />
        </header>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
          {posts.map((post) => (
            <button
              key={post.id}
              type="button"
              onClick={() => onOpen(post, posts)}
              className="flex w-full items-start gap-3 rounded-2xl border border-line bg-background/60 p-3 text-left hover:border-accent"
            >
              <span className={`mt-1 size-2.5 shrink-0 rounded-full ${BAR[post.status]}`} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wide text-muted">
                    {hourLabel(post.hour)}
                  </span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold uppercase ${PILL[post.status]}`}
                  >
                    {STAMP[post.status]}
                  </span>
                  <span className="ml-auto flex gap-1">
                    {post.platforms.map((platform) => (
                      <PlatformMark key={platform} platform={platform} />
                    ))}
                  </span>
                </span>
                <span className="mt-1 block truncate text-sm font-semibold text-foreground">
                  {post.title}
                </span>
              </span>
            </button>
          ))}
        </div>
        <footer className="flex items-center justify-between border-t border-line px-5 py-3">
          <p className="text-xs font-semibold text-muted">
            Same hour stacks in week view. Open a chip for the full post.
          </p>
          <Link
            href={composeHref(day, 10)}
            className="rounded-xl bg-accent px-3 py-2 text-sm font-bold text-accent-fg"
          >
            New on this day
          </Link>
        </footer>
      </div>
    </Overlay>
  );
}

export function PostModal({
  post,
  queue,
  onClose,
  onSelect,
  metrics,
}: {
  post: CalPost;
  queue: CalPost[];
  onClose: () => void;
  onSelect: (post: CalPost) => void;
  metrics?: {
    impressions: number;
    likes: number;
    comments: number;
    shares: number;
    clicks: number;
  };
}) {
  const index = Math.max(
    0,
    queue.findIndex((item) => item.id === post.id),
  );
  const prev = queue[index - 1];
  const next = queue[index + 1];
  const when = post.day.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <Overlay onClose={onClose}>
      <div className="flex max-h-[min(760px,90vh)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-line bg-card shadow-2xl">
        <header className="flex items-start justify-between gap-4 px-6 pt-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${PILL[post.status]}`}
              >
                {STAMP[post.status]}
              </span>
              <span className="text-sm font-bold text-muted">
                {when} · {hourLabel(post.hour)} IST
              </span>
              <span className="flex gap-1">
                {post.platforms.map((platform) => (
                  <PlatformMark key={platform} platform={platform} />
                ))}
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight">
              {post.title}
            </h2>
            <p className="mt-1 text-sm font-semibold text-muted">
              @{post.account}
            </p>
          </div>
          <CloseButton onClick={onClose} />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {post.error ? (
            <p className="mb-4 rounded-2xl border border-today/40 bg-today/10 px-4 py-3 text-sm font-semibold text-today">
              {post.error}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
            <div className="flex aspect-square items-end rounded-2xl bg-gradient-to-br from-accent/80 via-accent-2/70 to-[#1a1428] p-3">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-accent-fg">
                {post.media ?? "Text only"}
              </p>
            </div>
            <p className="text-base leading-relaxed text-foreground">{post.body}</p>
          </div>

          {metrics ? (
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {(
                [
                  ["Views", metrics.impressions],
                  ["Likes", metrics.likes],
                  ["Comments", metrics.comments],
                  ["Shares", metrics.shares],
                  ["Clicks", metrics.clicks],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl bg-background/70 px-3 py-2"
                >
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted">
                    {label}
                  </p>
                  <p className="text-lg font-extrabold">
                    {new Intl.NumberFormat("en-IN", {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    }).format(value)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {post.platforms.map((platform) => (
              <div
                key={platform}
                className="rounded-2xl border border-line bg-background/70 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wide text-muted">
                    {platform === "linkedin" ? "LinkedIn" : "X"} preview
                  </span>
                  <PlatformMark platform={platform} />
                </div>
                <p className="mt-2 line-clamp-4 text-sm leading-snug">
                  {post.body}
                </p>
                <p className="mt-2 text-[11px] font-bold text-muted">
                  {post.body.length}/
                  {platform === "linkedin" ? 3000 : 280}
                </p>
              </div>
            ))}
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4">
          <div className="flex items-center gap-2">
            {queue.length > 1 ? (
              <>
                <button
                  type="button"
                  disabled={!prev}
                  onClick={() => prev && onSelect(prev)}
                  className="rounded-lg border border-line px-2 py-1 text-sm font-bold disabled:opacity-30"
                >
                  ‹
                </button>
                <span className="text-xs font-bold uppercase tracking-wide text-muted">
                  {index + 1} of {queue.length}
                </span>
                <button
                  type="button"
                  disabled={!next}
                  onClick={() => next && onSelect(next)}
                  className="rounded-lg border border-line px-2 py-1 text-sm font-bold disabled:opacity-30"
                >
                  ›
                </button>
              </>
            ) : (
              <span className="text-xs font-semibold text-muted">Sample preview</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {post.status === "failed" ? (
              <button
                type="button"
                className="rounded-xl bg-today px-3 py-2 text-sm font-bold text-white"
              >
                Retry
              </button>
            ) : null}
            {post.status === "scheduled" ? (
              <button
                type="button"
                className="rounded-xl border border-line px-3 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
            ) : null}
            <Link
              href={composeHref(post.day, post.hour)}
              className="rounded-xl bg-accent px-3 py-2 text-sm font-bold text-accent-fg"
            >
              {post.status === "published" ? "Duplicate" : "Edit"}
            </Link>
          </div>
        </footer>
      </div>
    </Overlay>
  );
}

function Overlay({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0714]/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex w-full justify-center"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Close"
      onClick={onClick}
      className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-line text-lg font-bold hover:border-accent hover:text-accent"
    >
      ×
    </button>
  );
}
