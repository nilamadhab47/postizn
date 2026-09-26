"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type ChannelAccount = {
  id: string;
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

export function ComposeBoard({
  initialAt,
  initialPostId,
}: {
  initialAt?: string;
  initialPostId?: string;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const area = useRef<HTMLTextAreaElement>(null);
  const pending = useRef(false);
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
  const [confirmNow, setConfirmNow] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageError, setImageError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );
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
        if (!initialPostId) setSelected(next);
      })
      .catch(() => undefined);
    void api<{ remaining: number | null }>("/compose/ai")
      .then((data) => setImageLeft(data.remaining))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!initialPostId) return;
    void api<SavedPost>(`/posts/${initialPostId}`)
      .then((post) => {
        setGlobalDraft(post.content);
        setOverrides(post.contentByPlatform ?? {});
        setImage(post.mediaUrls[0] ?? null);
        if (post.scheduledAt) setWhen(toLocalInput(post.scheduledAt));
        const next: Record<string, boolean> = {};
        for (const target of post.targets) next[target.platform] = true;
        if (Object.keys(next).length) setSelected(next);
      })
      .catch(() =>
        setBanner({ kind: "err", text: "Could not open that draft." }),
      );
  }, [initialPostId]);

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
    setBanner(null);
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
      setBanner({
        kind: "err",
        text: err instanceof ApiError ? err.message : "Could not write",
      });
    } finally {
      setBusy(null);
    }
  }

  async function runSuggest(kind: string) {
    setBusy(kind);
    setBanner(null);
    try {
      const data = await api<{ text: string }>("/compose/suggest", {
        method: "POST",
        body: JSON.stringify({ draft: activeValue, kind }),
      });
      if (kind === "hashtags") setActive(`${activeValue.trim()}\n\n${data.text}`);
      else setActive(data.text);
    } catch (err) {
      setBanner({
        kind: "err",
        text: err instanceof ApiError ? err.message : "Could not suggest",
      });
    } finally {
      setBusy(null);
    }
  }

  function requestImage() {
    if (pending.current || busy) return;
    if (imageLeft === 0 && user?.plan !== "PRO") {
      setBanner({
        kind: "err",
        text: "Test image cap reached. PRO unlocks more generations.",
      });
      return;
    }
    setBanner(null);
    setImageError(null);
    setImageOpen(true);
  }

  async function runImage() {
    const idea = imagePrompt.trim();
    if (!idea) {
      setImageError("Describe the image you want.");
      return;
    }
    if (imageLeft === 0 && user?.plan !== "PRO") {
      setImageError("Test image cap reached. PRO unlocks more generations.");
      return;
    }
    setBusy("image");
    setImageError(null);
    setBanner(null);
    try {
      const data = await api<{ dataUrl: string; remaining: number | null }>(
        "/compose/image",
        {
          method: "POST",
          body: JSON.stringify({ prompt: idea }),
        },
      );
      setImageLeft(data.remaining);
      const stored = await api<{ url: string }>("/media/data", {
        method: "POST",
        body: JSON.stringify({ dataUrl: data.dataUrl, fileName: "generated.png" }),
      });
      setImage(stored.url);
      setImageOpen(false);
    } catch (err) {
      setImageError(
        err instanceof ApiError ? err.message : "Could not generate image",
      );
    } finally {
      setBusy(null);
    }
  }

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    setBusy("upload");
    setBanner(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const stored = await api<{ url: string }>("/media", { method: "POST", body });
      setImage(stored.url);
    } catch (err) {
      setBanner({
        kind: "err",
        text: err instanceof ApiError ? err.message : "Could not upload image",
      });
    } finally {
      setBusy(null);
    }
  }

  function toggle(platform: string) {
    setSelected((prev) => {
      const next = { ...prev, [platform]: !prev[platform] };
      if (tab === platform && next[platform] === false) setTab("all");
      return next;
    });
  }

  async function submit(action: "draft" | "schedule" | "now") {
    if (pending.current || busy) return;
    const rows = selectedRows.filter((row) => row.account);
    if (!rows.length) {
      setBanner({ kind: "err", text: "Connect and select a channel first." });
      return;
    }
    if (action === "schedule" && !when) {
      setBanner({ kind: "err", text: "Pick an IST time first." });
      return;
    }

    const contentByPlatform: Record<string, string> = {};
    for (const row of rows) {
      if (overrides[row.platform] !== undefined) {
        contentByPlatform[row.platform] = overrides[row.platform];
      }
    }

    pending.current = true;
    setBusy(action);
    setBanner(null);
    try {
      const post = await api<SavedPost>("/posts", {
        method: "POST",
        body: JSON.stringify({
          action,
          content: globalDraft,
          contentByPlatform,
          platforms: rows.map((row) => row.platform),
          scheduledAt: when ? new Date(when).toISOString() : null,
          mediaUrls: image && image.startsWith("http") ? [image] : [],
        }),
      });
      const nextStatus =
        action === "draft" ? "DRAFT" : action === "schedule" ? "SCHEDULED" : post.status;
      router.push(`/posts?status=${nextStatus}`);
    } catch (err) {
      pending.current = false;
      setBusy(null);
      setBanner({
        kind: "err",
        text: err instanceof ApiError ? err.message : "Could not save the post",
      });
    }
  }

  function requestPostNow() {
    if (pending.current || busy) return;
    const rows = selectedRows.filter((row) => row.account);
    if (!rows.length) {
      setBanner({ kind: "err", text: "Connect and select a channel first." });
      return;
    }
    setConfirmNow(true);
  }

  const whenLabel = when
    ? new Date(when).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Now";

  const noneConnected = selectedRows.every((row) => !row.account);
  const noneSelected = selectedRows.length === 0 || noneConnected;
  const locked = Boolean(busy);
  const sending = busy === "draft" || busy === "schedule" || busy === "now";
  const sendChannels = selectedRows
    .filter((row) => row.account)
    .map((row) => row.label)
    .join(", ");

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
                Add image{busy === "upload" ? "…" : ""}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPickFile(e.target.files?.[0])}
                />
              </label>
              <button
                type="button"
                onClick={requestImage}
                disabled={Boolean(busy)}
                className="rounded-lg px-2 py-1 text-sm font-semibold hover:bg-background disabled:opacity-40"
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
              rows={image ? 3 : 10}
              placeholder={
                PLACEHOLDERS[tab] ||
                "Write once. We’ll show every selected feed on the right."
              }
              className={`w-full resize-y bg-transparent px-4 pt-3 text-base leading-relaxed outline-none placeholder:text-muted ${
                image ? "min-h-[72px] pb-2" : "min-h-[220px] pb-3"
              }`}
            />
            {image ? (
              <div className="px-4 pb-3">
                <div className="relative max-w-md overflow-hidden rounded-xl border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image}
                    alt="Attached to this post"
                    className="max-h-52 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setImage(null)}
                    className="absolute right-2 top-2 rounded-lg bg-background/90 px-2 py-1 text-xs font-bold hover:bg-today hover:text-white"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : null}
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

          {banner ? (
            <p
              className={`mt-3 rounded-xl border px-3 py-2 text-sm font-semibold ${
                banner.kind === "ok"
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-today/40 bg-today/10 text-today"
              }`}
            >
              {banner.text}
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

          <div className="mt-8">
            <div className="flex flex-wrap gap-2" aria-busy={sending}>
              <button
                type="button"
                disabled={locked}
                aria-busy={busy === "draft"}
                onClick={() => void submit("draft")}
                className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold disabled:cursor-wait disabled:opacity-40"
              >
                {busy === "draft" ? <Spinner /> : null}
                {busy === "draft" ? "Saving draft…" : "Save draft"}
              </button>
              <button
                type="button"
                disabled={anyOver || noneSelected || locked}
                aria-busy={busy === "schedule"}
                onClick={() => void submit("schedule")}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-fg disabled:cursor-wait disabled:opacity-40"
              >
                {busy === "schedule" ? <Spinner /> : null}
                {busy === "schedule" ? "Scheduling…" : "Schedule"}
              </button>
              <button
                type="button"
                disabled={anyOver || noneSelected || locked}
                aria-busy={busy === "now"}
                onClick={requestPostNow}
                className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold disabled:cursor-wait disabled:opacity-40"
              >
                {busy === "now" ? <Spinner /> : null}
                {busy === "now" ? "Publishing…" : "Post now"}
              </button>
            </div>
            {sending ? (
              <p className="mt-2 text-xs font-semibold text-muted" aria-live="polite">
                {busy === "draft"
                  ? "Saving your draft…"
                  : busy === "schedule"
                    ? `Queuing for ${whenLabel} IST…`
                    : `Publishing to ${sendChannels || "your channels"}…`}
              </p>
            ) : null}
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

      <Dialog
        open={confirmNow}
        onOpenChange={(open) => {
          if (typeof open === "boolean") setConfirmNow(open);
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Publish now?</DialogTitle>
            <DialogDescription>
              This sends immediately to {sendChannels || "your channels"}. You
              cannot pull it back from postN.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-1.5">
            {selectedRows
              .filter((row) => row.account)
              .map((row) => (
                <span
                  key={row.platform}
                  className="rounded-full border border-line px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-muted"
                >
                  {row.label}
                </span>
              ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-line bg-transparent hover:bg-card hover:text-foreground"
              onClick={() => setConfirmNow(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirmNow(false);
                void submit("now");
              }}
            >
              Post now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={imageOpen}
        onOpenChange={(open) => {
          if (typeof open === "boolean" && busy !== "image") setImageOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={busy !== "image"}>
          <DialogHeader>
            <DialogTitle>What should the image look like?</DialogTitle>
            <DialogDescription>
              Describe the picture. We only send this prompt — not your post text.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="image-prompt">Image prompt</Label>
            <Textarea
              id="image-prompt"
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              rows={4}
              disabled={busy === "image"}
              placeholder="Mango preserve jar on a packing table, warm warehouse light, no text on the image"
              className="border-line bg-background text-foreground placeholder:text-muted"
            />
            {imageError ? (
              <p className="text-xs font-semibold text-today">{imageError}</p>
            ) : null}
            {activeValue.trim() ? (
              <button
                type="button"
                disabled={busy === "image"}
                onClick={() => setImagePrompt(activeValue.trim().slice(0, 400))}
                className="justify-self-start text-xs font-semibold text-muted hover:text-accent"
              >
                Insert post text
              </button>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-line bg-transparent hover:bg-card hover:text-foreground"
              disabled={busy === "image"}
              onClick={() => setImageOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={busy === "image" || !imagePrompt.trim()}
              onClick={() => void runImage()}
            >
              {busy === "image" ? "Generating…" : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

function Spinner() {
  return (
    <svg
      className="size-3.5 animate-spin"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <path
        d="M14 8a6 6 0 0 0-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
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

type SavedPost = {
  id: string;
  content: string;
  contentByPlatform: Record<string, string> | null;
  mediaUrls: string[];
  status: string;
  scheduledAt: string | null;
  failedReason: string | null;
  targets: Array<{
    platform: string;
    status: string;
    failedReason: string | null;
  }>;
};
