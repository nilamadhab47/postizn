"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { ChannelIcon } from "@/components/accounts/channel-icons";
import {
  PLATFORM_LIMITS,
  TELEGRAM_CAPTION,
  applyToSelection,
  platformCharCount,
  toUnicodeBold,
  toUnicodeItalic,
  type ComposePlatform,
} from "@/lib/compose-text";
import { ChannelPreview } from "@/components/compose/preview-cards";

type ChannelAccount = {
  platform: string;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
};

type ProviderRow = {
  slug: string;
  platform: string;
  label: string;
  plan: "FREE" | "PRO";
  connectMode: "oauth" | "token" | "soon" | "gone";
  account: ChannelAccount | null;
};

type Catalog = {
  providers: ProviderRow[];
};

const PLACEHOLDERS: Record<string, string> = {
  TWITTER: "Short version for X. Stay under 280.",
  LINKEDIN: "Longer founder note for LinkedIn.",
  LINKEDIN_PAGE: "Company Page update. Sounds like the brand, not you.",
  TELEGRAM: "Channel post for Telegram. Captions cap at 1,024 with a photo.",
  SLACK: "Message for your Slack channel.",
  DISCORD: "Webhook message for Discord.",
  DEVTO: "First line is the title. Rest is the unpublished Dev.to article.",
};

const PREVIEW_TINT: Record<string, string> = {
  LINKEDIN: "text-[#7aa2ff]",
  LINKEDIN_PAGE: "text-[#7aa2ff]",
  TWITTER: "text-muted",
  TELEGRAM: "text-[#6ab3e6]",
  SLACK: "text-[#ecb22e]",
  DISCORD: "text-[#8ea1ff]",
  DEVTO: "text-[#f7df1e]",
};

function isComposePlatform(value: string): value is ComposePlatform {
  return value in PLATFORM_LIMITS;
}

export function ComposeBoard({ initialAt }: { initialAt?: string }) {
  const { user } = useAuth();
  const area = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<string>("all");
  const [globalDraft, setGlobalDraft] = useState("");
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [image, setImage] = useState<string | null>(null);
  const [when, setWhen] = useState(toLocalInput(initialAt));
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [live, setLive] = useState<ProviderRow[]>([]);
  const [soon, setSoon] = useState<ProviderRow[]>([]);
  const [variations, setVariations] = useState<string[]>([]);
  const [aiSource, setAiSource] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [imageLeft, setImageLeft] = useState<number | null>(3);

  const name = user?.name || "Demo";
  const selectedRows = live.filter((row) => selected[row.platform]);
  const activeValue = tab === "all" ? globalDraft : (overrides[tab] ?? globalDraft);

  const counts = useMemo(
    () =>
      live.map((row) => {
        const body = overrides[row.platform] ?? globalDraft;
        const platform = isComposePlatform(row.platform) ? row.platform : "LINKEDIN";
        const count = platformCharCount(platform, body);
        const limit = PLATFORM_LIMITS[platform];
        const captionOver =
          row.platform === "TELEGRAM" && Boolean(image) && count > TELEGRAM_CAPTION;
        return {
          platform: row.platform,
          label: row.label,
          count,
          limit,
          over: selected[row.platform] && (count > limit || captionOver),
          captionOver,
        };
      }),
    [live, overrides, globalDraft, selected, image],
  );

  const anyOver = counts.some((row) => row.over);
  const hour = when ? Number(when.slice(11, 13)) : new Date().getHours();
  const inPeak = hour >= 19 && hour <= 22;

  useEffect(() => {
    void api<Catalog>("/social/channels")
      .then((data) => {
        const liveRows = data.providers.filter(
          (row) => row.connectMode === "oauth" || row.connectMode === "token",
        );
        const soonRows = data.providers.filter((row) => row.connectMode === "soon");
        setLive(liveRows);
        setSoon(soonRows);
        const next: Record<string, boolean> = {};
        for (const row of liveRows) next[row.platform] = Boolean(row.account);
        if (!Object.values(next).some(Boolean)) {
          for (const row of liveRows) next[row.platform] = row.plan === "FREE";
        }
        setSelected(next);
      })
      .catch(() => undefined);
    void api<{ remaining: number | null }>("/compose/ai")
      .then((data) => setImageLeft(data.remaining))
      .catch(() => undefined);
  }, []);

  function setActive(next: string) {
    if (tab === "all") setGlobalDraft(next);
    else setOverrides((prev) => ({ ...prev, [tab]: next }));
  }

  function format(kind: "bold" | "italic") {
    const node = area.current;
    if (!node) return;
    const start = node.selectionStart;
    const end = node.selectionEnd;
    const mapped = applyToSelection(
      activeValue,
      start,
      end,
      kind === "bold" ? toUnicodeBold : toUnicodeItalic,
    );
    setActive(mapped.value);
    requestAnimationFrame(() => {
      node.focus();
      node.setSelectionRange(mapped.start, mapped.end);
    });
  }

  async function runVariations() {
    setBusy("write");
    setNotice(null);
    try {
      const data = await api<{ items: string[]; source: string }>(
        "/compose/variations",
        {
          method: "POST",
          body: JSON.stringify({ draft: activeValue }),
        },
      );
      setVariations(data.items);
      setAiSource(data.source);
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Could not write");
    } finally {
      setBusy(null);
    }
  }

  async function runSuggest(kind: string) {
    setBusy(kind);
    setNotice(null);
    try {
      const data = await api<{ text: string }>("/compose/suggest", {
        method: "POST",
        body: JSON.stringify({ draft: activeValue, kind }),
      });
      if (kind === "hashtags") setActive(`${activeValue.trim()}\n\n${data.text}`);
      else setActive(data.text);
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Could not suggest");
    } finally {
      setBusy(null);
    }
  }

  async function runImage() {
    if (imageLeft === 0 && user?.plan !== "PRO") {
      setNotice("Test image cap reached. PRO unlocks more generations.");
      return;
    }
    setBusy("image");
    setNotice(null);
    try {
      const data = await api<{ dataUrl: string; remaining: number | null }>(
        "/compose/image",
        {
          method: "POST",
          body: JSON.stringify({ prompt: activeValue }),
        },
      );
      setImage(data.dataUrl);
      setImageLeft(data.remaining);
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Could not generate image");
    } finally {
      setBusy(null);
    }
  }

  function onPickFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  function toggle(platform: string) {
    setSelected((prev) => {
      const next = { ...prev, [platform]: !prev[platform] };
      if (tab === platform && next[platform] === false) setTab("all");
      return next;
    });
  }

  const whenLabel = when
    ? new Date(when).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Now";

  const targetLabels = selectedRows.map((row) => row.label).join(" + ") || "no channel";
  const noneSelected = selectedRows.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line px-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Compose</h1>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">
            Write once · see every feed
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold">
            IST
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="bg-transparent text-sm outline-none"
            />
          </label>
          <span
            className={`hidden rounded-lg px-2 py-1 text-[11px] font-extrabold uppercase tracking-wide md:inline ${
              inPeak ? "bg-accent/15 text-accent" : "bg-today/10 text-today"
            }`}
          >
            {inPeak ? "Inside 7–10pm peak" : "Outside India peak"}
          </span>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section className="min-h-0 overflow-y-auto p-5">
          <div className="mb-4 flex flex-wrap gap-2">
            {live.map((row) => (
              <ChannelChip
                key={row.platform}
                slug={row.slug}
                label={row.label}
                on={Boolean(selected[row.platform])}
                handle={row.account?.username}
                locked={!row.account}
                onToggle={() => toggle(row.platform)}
              />
            ))}
          </div>
          {soon.length ? (
            <p className="mb-3 text-[11px] font-semibold text-muted">
              Coming later: {soon.map((row) => row.label).join(" · ")}
            </p>
          ) : null}

          <div className="mb-3 flex gap-1 overflow-x-auto rounded-xl border border-line bg-card p-1">
            <TabButton
              on={tab === "all"}
              onClick={() => setTab("all")}
              label="All"
            />
            {selectedRows.map((row) => (
              <TabButton
                key={row.platform}
                on={tab === row.platform}
                onClick={() => setTab(row.platform)}
                label={row.label}
                edited={overrides[row.platform] !== undefined}
              />
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            <div className="flex flex-wrap items-center gap-1 border-b border-line px-2 py-2">
              <Tool onClick={() => format("bold")} label="Bold">
                B
              </Tool>
              <Tool onClick={() => format("italic")} label="Italic">
                <span className="italic">I</span>
              </Tool>
              <span
                className="px-2 text-[11px] font-bold uppercase tracking-wide text-muted"
                title="Underline does not render on most networks"
              >
                U off
              </span>
              <span className="mx-1 h-5 w-px bg-line" />
              <label className="cursor-pointer rounded-lg px-2 py-1 text-sm font-semibold hover:bg-background">
                Add image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPickFile(e.target.files?.[0])}
                />
              </label>
              <button
                type="button"
                onClick={() => void runImage()}
                className="rounded-lg px-2 py-1 text-sm font-semibold hover:bg-background"
              >
                Generate image
                <span className="ml-1 text-[10px] font-extrabold uppercase text-accent">
                  {user?.plan === "PRO" ? "PRO" : `${imageLeft ?? 0} test`}
                </span>
              </button>
              {image ? (
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  className="text-xs font-semibold text-muted hover:text-today"
                >
                  Remove
                </button>
              ) : null}
            </div>
            <textarea
              ref={area}
              value={activeValue}
              onChange={(e) => setActive(e.target.value)}
              placeholder={
                PLACEHOLDERS[tab] ||
                "Write once. We’ll show every selected feed on the right."
              }
              className="min-h-[280px] w-full resize-y bg-transparent px-4 py-3 text-base leading-relaxed outline-none placeholder:text-muted"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2 text-[12px] font-bold">
              {selectedRows.length ? (
                selectedRows.map((row) => {
                  const stat = counts.find((item) => item.platform === row.platform);
                  if (!stat) return null;
                  return (
                    <span
                      key={row.platform}
                      className={stat.over ? "text-today" : "text-muted"}
                    >
                      {row.label} {stat.count.toLocaleString("en-IN")} /{" "}
                      {(row.platform === "TELEGRAM" && image
                        ? TELEGRAM_CAPTION
                        : stat.limit
                      ).toLocaleString("en-IN")}
                      {stat.captionOver ? " · caption" : ""}
                    </span>
                  );
                })
              ) : (
                <span className="text-muted">Pick at least one channel</span>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void runVariations()}
              className="rounded-xl bg-accent px-3 py-2 text-sm font-bold text-accent-fg"
            >
              {busy === "write" ? "Writing…" : "Write with Claude"}
            </button>
            {selected.TWITTER ? (
              <button
                type="button"
                onClick={() => void runSuggest("shorten-x")}
                className="rounded-xl border border-line px-3 py-2 text-sm font-semibold"
              >
                {busy === "shorten-x" ? "…" : "Shorten for X"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void runSuggest("india")}
              className="rounded-xl border border-line px-3 py-2 text-sm font-semibold"
            >
              {busy === "india" ? "…" : "India / IST"}
            </button>
            <button
              type="button"
              onClick={() => void runSuggest("hashtags")}
              className="rounded-xl border border-line px-3 py-2 text-sm font-semibold"
            >
              Hashtags
            </button>
          </div>

          {notice ? (
            <p className="mt-3 rounded-xl border border-today/40 bg-today/10 px-3 py-2 text-sm font-semibold text-today">
              {notice}
            </p>
          ) : null}

          {variations.length ? (
            <div className="mt-4 space-y-2">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">
                {aiSource === "claude" ? "Claude" : "Sample"} · tap to use
              </p>
              {variations.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setActive(item)}
                  className="block w-full rounded-xl border border-line bg-card px-3 py-2 text-left text-sm hover:border-accent"
                >
                  {item}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setNotice("Draft stays in this screen for now. Queue save comes with publish.")
              }
              className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold"
            >
              Save draft
            </button>
            <button
              type="button"
              disabled={anyOver || noneSelected}
              onClick={() =>
                setNotice(
                  when
                    ? `Would schedule ${whenLabel} IST to ${targetLabels}.`
                    : "Pick an IST time first.",
                )
              }
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-fg disabled:opacity-40"
            >
              Schedule
            </button>
            <button
              type="button"
              disabled={anyOver || noneSelected}
              onClick={() =>
                setNotice("Post now waits for the publish worker. Preview is live.")
              }
              className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold disabled:opacity-40"
            >
              Post now
            </button>
          </div>
        </section>

        <aside className="min-h-0 space-y-4 overflow-y-auto border-t border-line bg-[#0e0a18] p-5 lg:border-l lg:border-t-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted">
            Live preview
          </p>
          {selectedRows.length ? (
            selectedRows.map((row) => {
              const account = row.account;
              const body = overrides[row.platform] ?? globalDraft;
              return (
                <button
                  key={row.platform}
                  type="button"
                  className="block w-full text-left"
                  onClick={() => setTab(row.platform)}
                >
                  <p
                    className={`mb-2 text-[11px] font-bold uppercase tracking-wide ${
                      PREVIEW_TINT[row.platform] ?? "text-muted"
                    }`}
                  >
                    {row.label}
                    {!account ? " · preview only" : ""}
                  </p>
                  <ChannelPreview
                    platform={row.platform}
                    name={account?.displayName || name}
                    handle={account?.username || row.slug}
                    avatar={account?.avatar ?? null}
                    body={body}
                    image={image}
                    when={whenLabel}
                  />
                </button>
              );
            })
          ) : (
            <p className="text-sm font-semibold text-muted">
              Select a channel to preview the feed.
            </p>
          )}
          <p className="text-xs font-semibold text-muted">
            Bold/italic are Unicode, so the feed matches what we send. Underline
            is off — most networks do not render it. Dev.to uses the first line
            as the title and saves unpublished.
          </p>
        </aside>
      </div>
    </div>
  );
}

function ChannelChip({
  slug,
  label,
  on,
  handle,
  locked,
  onToggle,
}: {
  slug: string;
  label: string;
  on: boolean;
  handle: string | null | undefined;
  locked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${
        on ? "bg-accent text-accent-fg" : "border border-line text-muted"
      }`}
    >
      <ChannelIcon slug={slug} className="size-4 rounded-md" />
      {label}
      {handle ? (
        <span className="font-semibold opacity-80">
          {handle.startsWith("@") ? handle : `@${handle}`}
        </span>
      ) : on ? (
        <span className="text-[10px] font-extrabold uppercase opacity-70">preview</span>
      ) : locked ? (
        <span className="text-[10px] font-extrabold uppercase opacity-70">off</span>
      ) : null}
    </button>
  );
}

function TabButton({
  on,
  onClick,
  label,
  edited,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  edited?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold ${
        on ? "bg-accent text-accent-fg" : "text-muted hover:text-foreground"
      }`}
    >
      {label}
      {edited ? " · edit" : ""}
    </button>
  );
}

function Tool({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="min-w-8 rounded-lg px-2 py-1 text-sm font-extrabold hover:bg-background"
    >
      {children}
    </button>
  );
}

function toLocalInput(at?: string) {
  if (!at) return "";
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) {
    return at.length >= 16 ? at.slice(0, 16) : "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
