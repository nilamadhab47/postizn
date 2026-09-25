"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import type { CalPost } from "@/lib/sample-calendar-posts";
import {
  ago,
  formatCount,
  sampleDashboard,
  whenLabel,
  type DashComment,
  type DashReaction,
  type EnrichedPost,
  type PostMetrics,
  REACTION_LABEL,
} from "@/lib/sample-dashboard";
import {
  PlatformMark,
  PostModal,
} from "@/components/calendar/post-preview";

export function HomeBoard() {
  const { user } = useAuth();
  const now = useMemo(() => new Date(), []);
  const data = useMemo(() => sampleDashboard(now), [now]);
  const [active, setActive] = useState<{
    post: CalPost;
    queue: CalPost[];
  } | null>(null);
  const first = user?.name?.split(" ")[0] ?? "there";
  const hour = now.getHours();
  const hello =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const nextHour = data.next?.hour ?? 19;
  const inPeak = nextHour >= 19 && nextHour <= 22;
  const mix = data.totals.impressions || 1;
  const linkedinPct = Math.round((data.totals.linkedin / mix) * 100);
  const xPct = 100 - linkedinPct;
  const failed = data.failed[0];

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
          <Link
            href="/compose"
            className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-accent-fg"
          >
            New post
          </Link>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {failed ? (
          <FailedBanner
            post={failed}
            onOpen={() => setActive({ post: failed, queue: data.failed })}
          />
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
          <section className="dash-glow relative overflow-hidden rounded-3xl border border-line p-5">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-accent">
              IST pulse · last 7 days
            </p>
            <p className="mt-3 text-6xl font-extrabold tracking-tight">
              {formatCount(data.totals.impressions)}
            </p>
            <p className="mt-1 text-sm font-semibold text-muted">
              impressions across LinkedIn + X. Same fields the APIs return
              after a post is live.
            </p>

            <Sparkline values={data.spark} />

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat k="Likes" v={data.totals.likes} />
              <Stat k="Comments" v={data.totals.comments} />
              <Stat k="Shares" v={data.totals.shares} />
              <Stat k="Clicks" v={data.totals.clicks} />
            </div>

            <div className="mt-5">
              <div className="mb-1.5 flex justify-between text-[11px] font-extrabold uppercase tracking-wide text-muted">
                <span>LinkedIn {linkedinPct}%</span>
                <span>X {xPct}%</span>
              </div>
              <div className="flex h-2 overflow-hidden rounded-full">
                <i className="bg-[#7aa2ff]" style={{ width: `${linkedinPct}%` }} />
                <i className="bg-foreground" style={{ width: `${xPct}%` }} />
              </div>
            </div>
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
                  inPeak
                    ? "bg-accent/15 text-accent"
                    : "bg-today/10 text-today"
                }`}
              >
                {inPeak
                  ? "Next post sits in the 7–10pm IST peak."
                  : "India peak is 7–10pm IST — this one is outside it."}
              </p>
            ) : null}
            <ol className="mt-4 flex-1 space-y-0">
              {data.upcoming.slice(0, 5).map((post, i) => (
                <li key={post.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`mt-1 size-2.5 rounded-full ${
                        i === 0 ? "bg-accent" : "bg-line"
                      }`}
                    />
                    {i < 4 ? <span className="w-px flex-1 bg-line" /> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setActive({ post, queue: data.upcoming })
                    }
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

        <section className="mt-6">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted">
                Already out
              </p>
              <p className="text-lg font-extrabold">Live posts, with engagement</p>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {data.published.map((post) => (
              <PublishedCard
                key={post.id}
                post={post}
                now={now}
                onOpen={() =>
                  setActive({ post, queue: data.published })
                }
              />
            ))}
          </div>
        </section>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
          <section className="rounded-3xl border border-line bg-card/40 p-5">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted">
              Recent comments
            </p>
            <p className="mt-1 text-sm font-semibold text-muted">
              Pulled from LinkedIn social actions + X replies on each post.
            </p>
            <ul className="mt-4 space-y-3">
              {data.comments.map((comment) => (
                <CommentRow
                  key={comment.id}
                  comment={comment}
                  post={data.posts.find((item) => item.id === comment.postId)}
                  onOpen={() => {
                    const post = data.posts.find(
                      (item) => item.id === comment.postId,
                    );
                    if (post) setActive({ post, queue: data.published });
                  }}
                />
              ))}
            </ul>
          </section>

          <section className="rounded-3xl border border-line p-5">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted">
              Likes · views · saves
            </p>
            <ul className="mt-4 space-y-3">
              {data.reactions.map((item) => (
                <ReactionRow
                  key={item.id}
                  item={item}
                  post={data.posts.find((p) => p.id === item.postId)}
                />
              ))}
            </ul>
          </section>
        </div>
      </div>

      {active ? (
        <PostModal
          post={active.post}
          queue={active.queue}
          onClose={() => setActive(null)}
          onSelect={(post) => setActive({ post, queue: active.queue })}
          metrics={
            active.post.status === "published"
              ? data.published.find((item) => item.id === active.post.id)
                  ?.metrics
              : undefined
          }
        />
      ) : null}
    </div>
  );
}

function FailedBanner({
  post,
  onOpen,
}: {
  post: CalPost;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mb-5 flex w-full items-center justify-between gap-3 rounded-2xl border border-today/40 bg-today/10 px-4 py-3 text-left"
    >
      <span>
        <span className="text-[11px] font-extrabold uppercase tracking-wide text-today">
          Needs you
        </span>
        <span className="mt-0.5 block text-sm font-semibold">{post.title}</span>
      </span>
      <span className="shrink-0 rounded-lg bg-today px-3 py-1.5 text-xs font-bold text-white">
        Retry
      </span>
    </button>
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

function PublishedCard({
  post,
  now,
  onOpen,
}: {
  post: EnrichedPost;
  now: Date;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-[260px] shrink-0 overflow-hidden rounded-2xl border border-line bg-card text-left hover:border-accent"
    >
      <div className="flex h-24 items-end bg-gradient-to-br from-accent/70 via-accent-2/50 to-[#1a1428] p-3">
        <span className="flex gap-1">
          {post.platforms.map((platform) => (
            <PlatformMark key={platform} platform={platform} />
          ))}
        </span>
      </div>
      <div className="p-3">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">
          {whenLabel(post, now)}
        </p>
        <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug">
          {post.title}
        </p>
        <MetricRow metrics={post.metrics} />
      </div>
    </button>
  );
}

function MetricRow({ metrics }: { metrics: PostMetrics }) {
  return (
    <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-muted">
      <span>{formatCount(metrics.impressions)} views</span>
      <span>{formatCount(metrics.likes)} likes</span>
      <span>{formatCount(metrics.comments)} comments</span>
      <span>{formatCount(metrics.shares)} shares</span>
    </p>
  );
}

function CommentRow({
  comment,
  post,
  onOpen,
}: {
  comment: DashComment;
  post?: CalPost;
  onOpen: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full gap-3 rounded-2xl bg-background/50 p-3 text-left hover:bg-background"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-2/30 text-xs font-extrabold">
          {comment.author.slice(0, 1)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-bold">{comment.author}</span>
            <PlatformMark platform={comment.platform} />
            <span className="ml-auto shrink-0 text-[11px] font-bold text-muted">
              {ago(comment.minutesAgo)}
            </span>
          </span>
          <span className="mt-1 block text-sm leading-snug text-foreground">
            {comment.text}
          </span>
          {post ? (
            <span className="mt-1 block truncate text-[11px] font-semibold text-muted">
              on “{post.title}”
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}

function ReactionRow({
  item,
  post,
}: {
  item: DashReaction;
  post?: CalPost;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-0.5 size-2 shrink-0 rounded-full ${
          item.kind === "like"
            ? "bg-today"
            : item.kind === "view"
              ? "bg-accent"
              : item.kind === "share"
                ? "bg-[#7aa2ff]"
                : "bg-foreground"
        }`}
      />
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wide text-muted">
          {REACTION_LABEL[item.kind]}
          <PlatformMark platform={item.platform} />
          <span className="font-bold normal-case tracking-normal">
            {ago(item.minutesAgo)}
          </span>
        </span>
        <span className="block text-sm font-semibold">{item.actor}</span>
        {post ? (
          <span className="block truncate text-[11px] text-muted">
            {post.title}
          </span>
        ) : null}
      </span>
    </li>
  );
}
