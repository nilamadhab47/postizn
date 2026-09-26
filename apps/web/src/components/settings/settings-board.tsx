"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AppHeader } from "@/components/layout/app-header";
import { channelLabel, formatIst } from "@/lib/platforms";
import type { Me } from "@/lib/api";

const TABS = [
  { id: "account", label: "Account" },
  { id: "queue", label: "Queue" },
  { id: "notifications", label: "Notifications" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const QUEUE_FILTERS = ["SCHEDULED", "PUBLISHED", "FAILED"] as const;

type Target = {
  platform: string;
  status: string;
  failedReason: string | null;
};

type QueuePost = {
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

type Notice = {
  id: string;
  postId: string;
  kind: "PUBLISHED" | "FAILED";
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export function SettingsBoard() {
  const router = useRouter();
  const search = useSearchParams();
  const requested = (search.get("tab") ?? "account").toLowerCase();
  const tab: TabId = TABS.some((item) => item.id === requested)
    ? (requested as TabId)
    : "account";

  function pick(next: TabId) {
    router.replace(`/settings?tab=${next}`);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <AppHeader title="Settings" />
      <div className="flex gap-1 border-b border-line px-5 py-3">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => pick(item.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              tab === item.id
                ? "bg-accent text-accent-fg"
                : "text-muted hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {tab === "account" ? <AccountPanel /> : null}
        {tab === "queue" ? <QueuePanel /> : null}
        {tab === "notifications" ? <NotificationsPanel /> : null}
      </div>
    </div>
  );
}

function AccountPanel() {
  const { user } = useAuth();
  const entitlements = user?.entitlements;
  const plan = user?.plan ?? "FREE";

  return (
    <div>
      <div className="max-w-lg rounded-xl border border-line bg-card p-5 text-base">
        <Row label="Name" value={user?.name ?? "—"} />
        <Row label="Email" value={user?.email ?? "—"} />
        <Row label="Plan" value={plan} />
        <Row label="Timezone" value={user?.timezone ?? "Asia/Kolkata"} />
      </div>

      <h2
        id="plan"
        className="mt-10 text-xs font-extrabold uppercase tracking-[0.18em] text-accent"
      >
        Plan
      </h2>
      <div className="mt-4 grid max-w-3xl gap-4 sm:grid-cols-2">
        <PlanCard
          name="FREE"
          current={plan === "FREE"}
          points={[
            "LinkedIn + X",
            `${entitlements?.channelLimit && plan === "FREE" ? entitlements.channelLimit : 2} channels`,
            "30 posts / month",
            "3 test image gens",
          ]}
        />
        <PlanCard
          name="PRO"
          current={plan === "PRO"}
          points={[
            "Everything on FREE",
            "LinkedIn Page, Telegram, Slack, Discord, Dev.to",
            "20 channels",
            "Unlimited image gens",
          ]}
        />
      </div>
      <p className="mt-4 max-w-lg text-sm text-muted">
        New accounts start on FREE. Razorpay checkout for PRO comes after
        publish works. Your founder login is PRO so we can test every channel.
      </p>
    </div>
  );
}

function QueuePanel() {
  const [filter, setFilter] = useState<(typeof QUEUE_FILTERS)[number]>("SCHEDULED");
  const [items, setItems] = useState<QueuePost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    return api<{ items: QueuePost[] }>(`/posts?status=${filter}`)
      .then((data) => setItems(data.items))
      .catch(() => setItems([]));
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
    const timer = window.setInterval(() => void load(), 12_000);
    return () => window.clearInterval(timer);
  }, [load]);

  return (
    <div>
      <p className="text-sm text-muted">
        Jobs the worker will send, already sent, or that did not go out. Times are IST.
      </p>
      <div className="mt-4 flex gap-1">
        {QUEUE_FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              filter === item
                ? "bg-accent text-accent-fg"
                : "text-muted hover:text-foreground"
            }`}
          >
            {item === "SCHEDULED" ? "Scheduled" : item === "PUBLISHED" ? "Published" : "Failed"}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {loading ? (
          <p className="text-sm font-semibold text-muted">Loading queue…</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center">
            <p className="text-xl font-bold">Nothing in this list</p>
            <p className="mt-2 text-base text-muted">
              Schedule from Compose and the worker picks it up at the IST time you set.
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
                  href={`/posts?status=${post.status === "PUBLISHING" ? "SCHEDULED" : post.status}`}
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
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={post.status} />
                      <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">
                        {queueWhen(post)}
                      </p>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold">
                      {post.content || "(image only)"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {post.targets.map((target) => (
                        <span
                          key={target.platform}
                          className="rounded-md border border-line px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted"
                        >
                          {channelLabel(target.platform)} {target.status.toLowerCase()}
                        </span>
                      ))}
                    </div>
                    {post.failedReason ? (
                      <p className="mt-2 text-xs font-semibold text-today">{post.failedReason}</p>
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

function NotificationsPanel() {
  const router = useRouter();
  const [items, setItems] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    return api<{ unread: number; items: Notice[] }>("/notifications")
      .then((data) => {
        setItems(data.items);
        setUnread(data.unread);
      })
      .catch(() => {
        setItems([]);
        setUnread(0);
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
    const timer = window.setInterval(() => void load(), 12_000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function readAll() {
    setBusy(true);
    try {
      await api("/notifications/read-all", { method: "POST" });
      window.dispatchEvent(new Event("postn:notices"));
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function openNotice(notice: Notice) {
    if (!notice.read) {
      await api(`/notifications/${notice.id}/read`, { method: "POST" }).catch(() => undefined);
      window.dispatchEvent(new Event("postn:notices"));
    }
    const status = notice.kind === "FAILED" ? "FAILED" : "PUBLISHED";
    router.push(`/posts?status=${status}`);
  }

  const empty = useMemo(() => !loading && items.length === 0, [loading, items.length]);

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted">
          When a scheduled post goes live or fails, it lands here. {unread ? `${unread} unread.` : "You are caught up."}
        </p>
        {unread ? (
          <button
            type="button"
            onClick={() => void readAll()}
            disabled={busy}
            className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-muted hover:text-foreground disabled:opacity-60"
          >
            {busy ? "Clearing…" : "Mark all read"}
          </button>
        ) : null}
      </div>
      <div className="mt-4">
        {loading ? (
          <p className="text-sm font-semibold text-muted">Loading notices…</p>
        ) : empty ? (
          <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center">
            <p className="text-xl font-bold">No notices yet</p>
            <p className="mt-2 text-base text-muted">
              Schedule a post. When the worker sends it, you will see posted or failed here.
            </p>
          </div>
        ) : (
          <ul className="grid gap-2">
            {items.map((notice) => (
              <li key={notice.id}>
                <button
                  type="button"
                  onClick={() => void openNotice(notice)}
                  className={`w-full rounded-2xl border p-4 text-left hover:border-accent ${
                    notice.read ? "border-line bg-card" : "border-accent/50 bg-accent/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold">{notice.title}</p>
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">
                      {formatIst(notice.createdAt)}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-muted">{notice.body}</p>
                  {!notice.read ? (
                    <p className="mt-2 text-[10px] font-extrabold uppercase tracking-wide text-accent">
                      New
                    </p>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const label =
    status === "SCHEDULED"
      ? "Queued"
      : status === "PUBLISHING"
        ? "Sending"
        : status === "PUBLISHED"
          ? "Published"
          : status === "FAILED"
            ? "Failed"
            : status;
  const tone =
    status === "FAILED"
      ? "bg-today/15 text-today"
      : status === "PUBLISHED"
        ? "bg-accent/15 text-accent"
        : "bg-card text-muted border border-line";
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${tone}`}>
      {label}
    </span>
  );
}

function queueWhen(post: QueuePost) {
  if (post.status === "SCHEDULED" || post.status === "PUBLISHING") {
    return `For ${formatIst(post.scheduledAt)}`;
  }
  return formatIst(post.publishedAt || post.createdAt);
}

function PlanCard({
  name,
  current,
  points,
}: {
  name: Me["plan"];
  current: boolean;
  points: string[];
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        current ? "border-accent bg-card" : "border-line bg-card"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold">{name}</p>
        {current ? (
          <span className="rounded-md bg-accent/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-accent">
            Current
          </span>
        ) : null}
      </div>
      <ul className="mt-4 space-y-2 text-sm text-muted">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-3 last:border-0">
      <span className="text-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}
