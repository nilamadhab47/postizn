"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { PayLink } from "@/components/billing/pay-link";
import { usePaywall } from "@/lib/use-paywall";
import { ApiError } from "@/lib/api";
import {
  fetchQueuePosts,
  formatCount,
  retryPost,
  stamp,
  toCalPost,
  whenLabel,
  type CalPost,
} from "@/lib/calendar-posts";
import { addDays, istWallClock, startOfDay } from "@/lib/calendar";
import { channelLabel } from "@/lib/platforms";
import {
  PlatformMark,
  PostModal,
} from "@/components/calendar/post-preview";
import { mediaKind } from "@postn/shared";
import { toast } from "sonner";
import { SetupHome } from "@/components/dashboard/setup-home";

export function HomeBoard() {
  const { user, refresh } = useAuth();
  const { lapsed, block } = usePaywall();
  const now = useMemo(() => istWallClock(), []);
  const today = startOfDay(now);
  const [posts, setPosts] = useState<CalPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<{
    post: CalPost;
    queue: CalPost[];
  } | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    void refresh();
    void fetchQueuePosts()
      .then(setPosts)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not load posts"),
      )
      .finally(() => setLoading(false));
  }, [refresh]);

  async function retryFailed(post: CalPost) {
    if (retrying) return;
    if (block()) return;
    setRetrying(true);
    try {
      const saved = await retryPost(post.id);
      const next = toCalPost(saved);
      setPosts((rows) => rows.map((row) => (row.id === next.id ? next : row)));
      toast.success(
        next.status === "failed"
          ? "Still failed on a channel"
          : "Sent to the failed channel",
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not retry");
    } finally {
      setRetrying(false);
    }
  }

  const data = useMemo(() => buildHome(posts, today), [posts, today]);
  const first = user?.name?.split(" ")[0] ?? "there";
  const hour = now.getHours();
  const hello =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const nextHour = data.next?.hour ?? 19;
  const inPeak = nextHour >= 19 && nextHour <= 22;
  const mixTotal = data.mix.reduce((sum, row) => sum + row.count, 0) || 1;
  const failed = data.failed[0];
  const setup = user?.setup;
  const channels = setup?.channels ?? 0;
  const postCount = setup?.posts ?? posts.length;
  const needsSetup =
    !lapsed && setup != null && (setup.channels === 0 || setup.posts === 0);
  const headerHref = channels === 0 ? "/accounts?from=start" : "/compose";
  const headerLabel =
    channels === 0 ? "Connect a channel" : postCount === 0 ? "Write first post" : "New post";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line px-5">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold tracking-tight">
            {hello}, {first}
          </h1>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">
            {now.toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "short",
            })}{" "}
            ·{" "}
            {now.toLocaleTimeString("en-IN", {
              hour: "numeric",
              minute: "2-digit",
            })}{" "}
            IST
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/calendar"
            className="rounded-xl border border-line px-3 py-2 text-sm font-semibold hover:border-accent"
          >
            Calendar
          </Link>
          <PayLink
            href={headerHref}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-accent-fg"
          >
            {headerLabel}
          </PayLink>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {error ? (
          <p className="mb-5 rounded-2xl border border-today/40 bg-today/10 px-4 py-3 text-sm font-semibold text-today">
            {error}
          </p>
        ) : null}
        {needsSetup ? (
          <SetupHome name={first} hasChannel={channels > 0} />
        ) : loading ? (
          <p className="mb-5 text-sm font-semibold text-muted">Loading your queue…</p>
        ) : null}

        {!needsSetup && failed ? (
          <FailedBanner
            post={failed}
            busy={retrying}
            onOpen={() => setActive({ post: failed, queue: data.failed })}
            onRetry={() => void retryFailed(failed)}
          />
        ) : null}

        {!needsSetup ? (
          <>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
          <section className="dash-glow relative overflow-hidden rounded-3xl border border-line p-5">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-accent">
              IST pulse · last 7 days
            </p>
            <p className="mt-3 text-6xl font-extrabold tracking-tight">
              {formatCount(data.publishedWeek.length)}
            </p>
            <p className="mt-1 text-sm font-semibold text-muted">
              posts that actually went out. Likes and views wait until we wire
              analytics.
            </p>

            <Sparkline values={data.spark} />

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat k="Queued" v={data.upcoming.length} />
              <Stat k="Published" v={data.published.length} />
              <Stat k="Failed" v={data.failed.length} />
              <Stat k="Channels" v={data.mix.length} />
            </div>

            {data.mix.length ? (
              <div className="mt-5">
                <div className="mb-1.5 flex justify-between text-[11px] font-extrabold uppercase tracking-wide text-muted">
                  {data.mix.slice(0, 2).map((row) => (
                    <span key={row.platform}>
                      {channelLabel(row.platform)}{" "}
                      {Math.round((row.count / mixTotal) * 100)}%
                    </span>
                  ))}
                </div>
                <div className="flex h-2 overflow-hidden rounded-full">
                  {data.mix.map((row, i) => (
                    <i
                      key={row.platform}
                      className={i === 0 ? "bg-[#7aa2ff]" : i === 1 ? "bg-foreground" : "bg-accent"}
                      style={{ width: `${(row.count / mixTotal) * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm font-semibold text-muted">
                Publish once and the mix shows up here.
              </p>
            )}
          </section>

          <section className="flex flex-col rounded-3xl border border-line bg-card/60 p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted">
                Coming up
              </p>
              <Link href="/calendar" className="text-xs font-bold text-accent">
                Open calendar
              </Link>
            </div>
            {data.next ? (
              <p
                className={`mt-3 rounded-xl px-3 py-2 text-xs font-bold ${
                  inPeak ? "bg-accent/15 text-accent" : "bg-today/10 text-today"
                }`}
              >
                {inPeak
                  ? "Next post sits in the 7–10pm IST peak."
                  : "India peak is 7–10pm IST — this one is outside it."}
              </p>
            ) : (
              <p className="mt-3 text-sm font-semibold text-muted">
                Nothing queued. Schedule from Compose or pick an hour on the calendar.
              </p>
            )}
            <ol className="mt-4 flex-1 space-y-0">
              {data.upcoming.slice(0, 5).map((post, i) => (
                <li key={post.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`mt-1 size-2.5 rounded-full ${
                        i === 0 ? "bg-accent" : "bg-line"
                      }`}
                    />
                    {i < Math.min(4, data.upcoming.length - 1) ? (
                      <span className="w-px flex-1 bg-line" />
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActive({ post, queue: data.upcoming })}
                    className="mb-4 min-w-0 flex-1 rounded-xl pb-1 text-left hover:text-accent"
                  >
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">
                      {whenLabel(post, now)}
                    </p>
                    <p className="truncate text-sm font-semibold">{post.title}</p>
                    <span className="mt-1 flex gap-1">
                      {post.platforms.map((platform) => (
                        <PlatformMark key={platform} platform={platform} />
                      ))}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <section className="mt-4 rounded-3xl border border-line bg-card/60 p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted">
              Already out
            </p>
            {data.published.length ? (
              <Link href="/posts?status=PUBLISHED" className="text-xs font-bold text-accent">
                View all
              </Link>
            ) : null}
          </div>
          {data.published.length ? (
            <ul className="mt-4">
              {data.published.slice(0, 6).map((post) => (
                <li key={post.id} className="border-b border-line last:border-b-0">
                  <PublishedRow
                    post={post}
                    now={now}
                    onOpen={() => setActive({ post, queue: data.published })}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-8 text-center">
              <p className="text-base font-bold">Nothing live yet</p>
              <p className="mt-1 text-sm text-muted">
                Post now or schedule, and it lands here.
              </p>
              <PayLink
                href="/compose"
                className="mt-4 inline-block rounded-xl bg-accent px-4 py-2 text-sm font-bold text-accent-fg"
              >
                Open compose
              </PayLink>
            </div>
          )}
        </section>
          </>
        ) : null}
      </div>

      {active ? (
        <PostModal
          post={active.post}
          queue={active.queue}
          onClose={() => setActive(null)}
          onSelect={(post) => setActive({ post, queue: active.queue })}
          onMutated={(next) => {
            const id = active.post.id;
            if (!next) {
              setPosts((rows) => rows.filter((row) => row.id !== id));
              setActive(null);
              return;
            }
            setPosts((rows) =>
              rows.map((row) => (row.id === next.id ? next : row)),
            );
            setActive((cur) =>
              cur
                ? {
                    post: next,
                    queue: cur.queue.map((row) =>
                      row.id === next.id ? next : row,
                    ),
                  }
                : cur,
            );
          }}
        />
      ) : null}
    </div>
  );
}

function buildHome(posts: CalPost[], today: Date) {
  const weekStart = addDays(today, -6);
  const published = posts
    .filter((post) => post.status === "published")
    .sort((a, b) => stamp(b) - stamp(a));
  const publishedWeek = published.filter(
    (post) => startOfDay(post.day).getTime() >= weekStart.getTime(),
  );
  const upcoming = posts
    .filter((post) => post.status === "scheduled")
    .sort((a, b) => stamp(a) - stamp(b));
  const failed = posts.filter((post) => post.status === "failed");

  const spark = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    return publishedWeek.filter(
      (post) => startOfDay(post.day).getTime() === startOfDay(day).getTime(),
    ).length;
  });

  const mixMap = new Map<string, number>();
  for (const post of publishedWeek) {
    for (const platform of post.platforms) {
      mixMap.set(platform, (mixMap.get(platform) ?? 0) + 1);
    }
  }
  const mix = [...mixMap.entries()]
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count);

  return {
    published,
    publishedWeek,
    upcoming,
    failed,
    spark,
    mix,
    next: upcoming[0] ?? null,
  };
}

function FailedBanner({
  post,
  busy,
  onOpen,
  onRetry,
}: {
  post: CalPost;
  busy: boolean;
  onOpen: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="mb-5 flex w-full items-center justify-between gap-3 rounded-2xl border border-today/40 bg-today/10 px-4 py-3">
      <button type="button" onClick={onOpen} className="min-w-0 text-left">
        <span className="text-[11px] font-extrabold uppercase tracking-wide text-today">
          Needs you
        </span>
        <span className="mt-0.5 block truncate text-sm font-semibold">
          {post.title}
        </span>
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onRetry}
        className="shrink-0 rounded-lg bg-today px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
      >
        {busy ? "Retrying…" : "Retry"}
      </button>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: number }) {
  return (
    <div className="rounded-2xl bg-background/50 px-3 py-3">
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">
        {k}
      </p>
      <p className="text-2xl font-extrabold">{formatCount(v)}</p>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="mt-6 flex h-16 items-end gap-1.5">
      {values.map((value, i) => (
        <span
          key={i}
          className={`flex-1 rounded-t-md ${
            i === values.length - 1 ? "bg-accent" : "bg-accent/30"
          }`}
          style={{ height: `${Math.max(12, (value / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

function PublishedRow({
  post,
  now,
  onOpen,
}: {
  post: CalPost;
  now: Date;
  onOpen: () => void;
}) {
  const kind = mediaKind(post.mediaMime ?? "");
  const hasMedia = Boolean(post.mediaUrl);
  const video = kind === "video";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 py-3 text-left hover:text-accent"
    >
      <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-background">
        {hasMedia && !video ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.mediaUrl} alt="" className="size-full object-cover" />
        ) : hasMedia && video ? (
          <video
            src={post.mediaUrl}
            className="size-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <span className="flex size-full items-center justify-center gap-0.5 bg-background/80 p-1">
            {post.platforms.slice(0, 3).map((platform) => (
              <PlatformMark key={platform} platform={platform} />
            ))}
          </span>
        )}
        {video ? (
          <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-[9px] font-extrabold uppercase tracking-wide text-white">
            Video
          </span>
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wide text-muted">
            {whenLabel(post, now)}
          </span>
          <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#6fbf62]">
            Posted
          </span>
        </span>
        <span className="mt-0.5 block truncate text-sm font-semibold text-foreground">
          {post.title}
        </span>
      </span>
      <span className="hidden shrink-0 gap-1 sm:flex">
        {post.platforms.map((platform) => (
          <PlatformMark key={platform} platform={platform} />
        ))}
      </span>
    </button>
  );
}
