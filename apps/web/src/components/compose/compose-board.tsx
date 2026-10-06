"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, ApiError, type Me } from "@/lib/api";
import { track } from "@/lib/analytics";
import { usePaywall } from "@/lib/use-paywall";
import { PAY_TO_USE } from "@/lib/paywall";
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
  MEDIA_FILE_ACCEPT,
  acceptedFiles,
  isFileDrag,
  mergePicked,
  lastNewStill,
  videoLengthError,
  videoSeconds,
  mediaForPlatform,
  mediaUrlsEqual,
  mediaAltPayload,
  canSetAlt,
  replaceStill,
  sameStill,
  stripStillFromVariants,
  type ComposeMedia,
} from "@/lib/compose-media";
import {
  MAX_ALT_TEXT,
  cleanChannelSettings,
  mediaBundleError,
  mediaKind,
  type ChannelSettings,
} from "@postn/shared";
import { IstDateTimePicker } from "@/components/compose/ist-datetime-picker";
import { MediaLibraryDialog } from "@/components/compose/media-library-picker";
import { ImageEditorDialog } from "@/components/compose/image-editor-dialog";
import { ChannelSettingsPanel } from "@/components/compose/channel-settings-panel";
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
  pausedByPlan?: boolean;
};

function liveAccount(row: { account: ChannelAccount | null }) {
  return row.account && !row.account.pausedByPlan ? row.account : null;
}

function quotaLine(user: Me | null, imageLeft: number | null, aiLeft: number | null) {
  const e = user?.entitlements;
  const access = e?.access ?? user?.plan ?? "FREE";
  const days =
    access === "TRIAL" && e?.trialDaysRemaining != null
      ? ` · ${e.trialDaysRemaining}d trial`
      : access === "FREE"
        ? " · pay to use"
        : "";
  const postsToday = e?.postsTodayRemaining;
  const postsMonth = e?.postsRemaining;
  const posts =
    postsToday != null && postsMonth != null
      ? `${postsToday} posts today · ${postsMonth} this month`
      : "Post quotas apply";
  return `${access}${days} · ${posts} · ${imageLeft ?? e?.imageRemaining ?? 0} images · ${aiLeft ?? e?.aiRemaining ?? 0} AI`;
}

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
  TELEGRAM: "Channel post for Telegram. Captions cap at 1,024 with media.",
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
  const { user, refresh } = useAuth();
  const { lapsed, block } = usePaywall();
  const router = useRouter();
  const area = useRef<HTMLTextAreaElement>(null);
  const pending = useRef(false);
  const [tab, setTab] = useState<string>("all");
  const [globalDraft, setGlobalDraft] = useState("");
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [media, setMedia] = useState<ComposeMedia[]>([]);
  const [mediaByPlatform, setMediaByPlatform] = useState<
    Record<string, ComposeMedia[]>
  >({});
  const [settingsByPlatform, setSettingsByPlatform] = useState<
    Record<string, ChannelSettings>
  >({});
  const [when, setWhen] = useState(toLocalInput(initialAt));
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [live, setLive] = useState<ProviderRow[]>([]);
  const [soon, setSoon] = useState<ProviderRow[]>([]);
  const [variations, setVariations] = useState<string[]>([]);
  const [aiSource, setAiSource] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmNow, setConfirmNow] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [cropItem, setCropItem] = useState<ComposeMedia | null>(null);
  const [cropPlatform, setCropPlatform] = useState<string | undefined>();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadedStatus, setLoadedStatus] = useState<string | null>(null);
  const [pinnedPlatforms, setPinnedPlatforms] = useState<Record<string, boolean>>(
    {},
  );
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageError, setImageError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );
  const [imageLeft, setImageLeft] = useState<number | null>(
    user?.entitlements?.imageRemaining ?? 3,
  );
  const [aiLeft, setAiLeft] = useState<number | null>(
    user?.entitlements?.aiRemaining ?? 8,
  );
  const [fileOver, setFileOver] = useState(false);
  const fileDragDepth = useRef(0);

  const name = user?.name || "Demo";
  const imageCapped = (imageLeft ?? 0) <= 0;
  const aiCapped = (aiLeft ?? 0) <= 0;
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
          row.platform === "TELEGRAM" && media.length > 0 && count > TELEGRAM_CAPTION;
        return {
          platform: row.platform,
          label: row.label,
          count,
          limit,
          over: selected[row.platform] && (count > limit || captionOver),
          captionOver,
        };
      }),
    [live, overrides, globalDraft, selected, media],
  );

  const anyOver = counts.some((row) => row.over);
  const hour = when ? Number(when.slice(11, 13)) : new Date().getHours();
  const inPeak = hour >= 19 && hour <= 22;
  const selectedPlatforms = selectedRows.map((row) => row.platform);
  const mediaWarning = mediaBundleError(
    media.map((item) => ({ ...item, bytes: 0 })),
    selectedPlatforms,
  );
  const hasMedia = media.length > 0;
  const stills = media.filter((item) => mediaKind(item.mimeType) === "image");
  const frameStill = stills.length === 1 ? stills[0] : null;
  const perFeed = frameStill ? mediaByPlatform : {};

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
        for (const row of liveRows) next[row.platform] = Boolean(liveAccount(row));
        if (!Object.values(next).some(Boolean)) {
          for (const row of liveRows) next[row.platform] = row.plan === "FREE";
        }
        if (!initialPostId) setSelected(next);
      })
      .catch(() => undefined);
    void api<{ remaining: number | null; aiRemaining?: number | null }>("/compose/ai")
      .then((data) => {
        setImageLeft(data.remaining);
        if (data.aiRemaining != null) setAiLeft(data.aiRemaining);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!initialPostId) return;
    void api<SavedPost>(`/posts/${initialPostId}`)
      .then((post) => {
        setGlobalDraft(post.content);
        setOverrides(post.contentByPlatform ?? {});
        const shared = post.media?.length
          ? post.media.map((item) => ({
              url: item.url,
              mimeType: item.mimeType,
              id: item.id,
              sourceId: item.sourceId,
              sourceUrl: item.sourceUrl,
              alt: item.alt,
            }))
          : post.mediaUrls.map((url) => ({ url, mimeType: "image/jpeg" }));
        setMedia(shared);
        const variants: Record<string, ComposeMedia[]> = {};
        const singleStill =
          shared.filter((item) => mediaKind(item.mimeType) === "image").length ===
          1;
        if (singleStill) {
          if (post.mediaByPlatform) {
            for (const [platform, files] of Object.entries(post.mediaByPlatform)) {
              if (files?.length) {
                variants[platform] = files.map((item) => ({
                  url: item.url,
                  mimeType: item.mimeType,
                  id: item.id,
                  sourceId: item.sourceId,
                  sourceUrl: item.sourceUrl,
                  alt: item.alt,
                }));
              }
            }
          } else {
            for (const target of post.targets) {
              if (target.media?.length) {
                variants[target.platform] = target.media.map((item) => ({
                  url: item.url,
                  mimeType: item.mimeType,
                  id: item.id,
                  sourceId: item.sourceId,
                  sourceUrl: item.sourceUrl,
                  alt: item.alt,
                }));
              }
            }
          }
        }
        setMediaByPlatform(variants);
        const loadedSettings: Record<string, ChannelSettings> = {};
        if (post.settingsByPlatform) {
          for (const [platform, value] of Object.entries(post.settingsByPlatform)) {
            const cleaned = cleanChannelSettings(platform, value);
            if (Object.keys(cleaned).length) loadedSettings[platform] = cleaned;
          }
        } else {
          for (const target of post.targets) {
            const cleaned = cleanChannelSettings(target.platform, target.settings);
            if (Object.keys(cleaned).length) loadedSettings[target.platform] = cleaned;
          }
        }
        setSettingsByPlatform(loadedSettings);
        if (post.scheduledAt) setWhen(toLocalInput(post.scheduledAt));
        const next: Record<string, boolean> = {};
        const pinned: Record<string, boolean> = {};
        for (const target of post.targets) {
          next[target.platform] = true;
          if (target.platformPostId || target.status === "PUBLISHED") {
            pinned[target.platform] = true;
          }
        }
        if (Object.keys(next).length) setSelected(next);
        setLoadedStatus(post.status);
        if (canPatchLoaded(post)) {
          setEditingId(post.id);
          setPinnedPlatforms(pinned);
        } else {
          setEditingId(null);
          setPinnedPlatforms({});
        }
        if (post.status === "PUBLISHING") {
          setBanner({
            kind: "err",
            text: "That post is sending. Wait a moment, then try again.",
          });
        }
      })
      .catch(() =>
        setBanner({ kind: "err", text: "Could not open that post." }),
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
    if (block()) return;
    if (aiCapped) {
      setBanner({
        kind: "err",
        text: "AI write cap reached for this plan.",
      });
      return;
    }
    setBusy("write");
    setBanner(null);
    try {
      const data = await api<{
        items: string[];
        source: string;
        remaining?: number | null;
      }>(
        "/compose/variations",
        {
          method: "POST",
          body: JSON.stringify({ draft: activeValue }),
        },
      );
      setVariations(data.items);
      setAiSource(data.source);
      if (data.remaining != null) setAiLeft(data.remaining);
      void refresh();
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
    if (block()) return;
    setBusy(kind);
    setBanner(null);
    try {
      const data = await api<{ text: string; remaining?: number | null }>(
        "/compose/suggest",
        {
          method: "POST",
          body: JSON.stringify({ draft: activeValue, kind }),
        },
      );
      if (kind === "hashtags") setActive(`${activeValue.trim()}\n\n${data.text}`);
      else setActive(data.text);
      if (data.remaining != null) setAiLeft(data.remaining);
      void refresh();
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
    if (block()) return;
    if (imageCapped) {
      setBanner({
        kind: "err",
        text: "Image cap reached for this plan.",
      });
      return;
    }
    setBanner(null);
    setImageError(null);
    setImageOpen(true);
  }

  async function runImage() {
    if (block()) return;
    const idea = imagePrompt.trim();
    if (!idea) {
      setImageError("Describe the image you want.");
      return;
    }
    if (imageCapped) {
      setImageError("Image cap reached for this plan.");
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
      void refresh();
        const stored = await api<{ url: string; mimeType?: string; id?: string }>("/media/data", {
          method: "POST",
          body: JSON.stringify({ dataUrl: data.dataUrl, fileName: "generated.png" }),
        });
        const incoming: ComposeMedia[] = [
          { id: stored.id, url: stored.url, mimeType: stored.mimeType ?? "image/png" },
        ];
      const merged = mergePicked(media, incoming);
      replaceMedia(merged.next);
      if (merged.note) setBanner({ kind: "ok", text: merged.note });
      const still = lastNewStill(media, merged.next);
      if (still) openCrop(still);
      setImageOpen(false);
    } catch (err) {
      setImageError(
        err instanceof ApiError ? err.message : "Could not generate image",
      );
    } finally {
      setBusy(null);
    }
  }

  function onEditorDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!isFileDrag(event) || busy) return;
    event.preventDefault();
    fileDragDepth.current += 1;
    setFileOver(true);
  }

  function onEditorDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!isFileDrag(event)) return;
    fileDragDepth.current = Math.max(0, fileDragDepth.current - 1);
    if (fileDragDepth.current === 0) setFileOver(false);
  }

  function onEditorDragOver(event: DragEvent<HTMLDivElement>) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = busy ? "none" : "copy";
  }

  function onEditorDrop(event: DragEvent<HTMLDivElement>) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    fileDragDepth.current = 0;
    setFileOver(false);
    if (busy) return;
    const incoming = acceptedFiles(event.dataTransfer.files);
    if (!incoming.length) {
      setBanner({
        kind: "err",
        text: "Use a JPEG, PNG, WebP, HEIC, GIF, or MP4",
      });
      return;
    }
    void onPickFiles(incoming);
  }

  async function onPickFiles(files: File[]) {
    if (block()) return;
    const incoming = acceptedFiles(files);
    if (!incoming.length) {
      setBanner({
        kind: "err",
        text: "Use a JPEG, PNG, WebP, HEIC, GIF, or MP4",
      });
      return;
    }
    setBusy("upload");
    setBanner(null);
    const linkedInSelected = Boolean(selected.LINKEDIN || selected.LINKEDIN_PAGE);
    const uploaded: ComposeMedia[] = [];
    try {
      for (const file of incoming) {
        if (file.type === "video/mp4") {
          try {
            const seconds = await videoSeconds(file);
            const lengthError = videoLengthError(seconds, linkedInSelected);
            if (lengthError) {
              setBanner({ kind: "err", text: lengthError });
              continue;
            }
          } catch {
            setBanner({ kind: "err", text: "Could not read that video" });
            continue;
          }
        }
        const body = new FormData();
        body.append("file", file);
        const stored = await api<{
          url: string;
          mimeType: string;
          id?: string;
          sourceId?: string | null;
          sourceUrl?: string | null;
        }>("/media", {
          method: "POST",
          body,
        });
        uploaded.push({
          id: stored.id,
          url: stored.url,
          mimeType: stored.mimeType,
          sourceId: stored.sourceId ?? undefined,
          sourceUrl: stored.sourceUrl ?? undefined,
        });
      }
      if (uploaded.length) {
        const merged = mergePicked(media, uploaded);
        replaceMedia(merged.next);
        if (merged.note) setBanner({ kind: "ok", text: merged.note });
        const still = lastNewStill(media, merged.next);
        if (still) openCrop(still);
      }
    } catch (err) {
      setBanner({
        kind: "err",
        text: err instanceof ApiError ? err.message : "Could not upload file",
      });
    } finally {
      setBusy(null);
    }
  }

  function toggle(platform: string) {
    if (block()) return;
    if (pinnedPlatforms[platform]) return;
    setSelected((prev) => {
      const next = { ...prev, [platform]: !prev[platform] };
      if (tab === platform && next[platform] === false) setTab("all");
      return next;
    });
  }

  function openCrop(item: ComposeMedia, platform?: string) {
    if (block()) return;
    setCropPlatform(platform);
    setCropItem(item);
  }

  function closeCrop() {
    setCropItem(null);
    setCropPlatform(undefined);
  }

  function replaceMedia(next: ComposeMedia[], drop?: ComposeMedia) {
    setMedia(next);
    const stillCount = next.filter((item) => mediaKind(item.mimeType) === "image")
      .length;
    if (stillCount !== 1) {
      setMediaByPlatform({});
      return;
    }
    if (drop) {
      setMediaByPlatform((prev) => stripStillFromVariants(prev, drop));
    }
  }

  function setStillAlt(item: ComposeMedia, alt: string) {
    const next = alt.slice(0, MAX_ALT_TEXT);
    setMedia((prev) =>
      prev.map((row) => (sameStill(row, item) ? { ...row, alt: next } : row)),
    );
  }

  function applyCrop(next: ComposeMedia) {
    const from = cropItem;
    if (!from) return;
    const live = media.find((row) => sameStill(row, from)) ?? from;
    const baked = { ...next, alt: live.alt };
    if (cropPlatform) {
      setMediaByPlatform((prev) => {
        const current = mediaForPlatform(
          media,
          frameStill ? prev : {},
          cropPlatform,
        );
        const list = replaceStill(current, from, baked);
        if (mediaUrlsEqual(list, media)) {
          const copy = { ...prev };
          delete copy[cropPlatform];
          return copy;
        }
        return { ...prev, [cropPlatform]: list };
      });
    } else {
      setMedia((prev) => replaceStill(prev, from, baked));
      setMediaByPlatform((prev) => stripStillFromVariants(prev, from));
    }
    closeCrop();
    track("media_cropped", {
      scope: cropPlatform ? "channel" : "shared",
      platform: cropPlatform,
    });
    setBanner({
      kind: "ok",
      text: cropPlatform
        ? `Crop saved for ${selectedRows.find((row) => row.platform === cropPlatform)?.label ?? "that feed"}. Original is still in your library.`
        : "Crop saved for every feed. Original is still in your library.",
    });
  }

  async function submit(action: "draft" | "schedule" | "now") {
    if (block()) return;
    if (pending.current || busy) return;
    const rows = selectedRows.filter((row) => liveAccount(row));
    const pausedRows = selectedRows.filter((row) => row.account?.pausedByPlan);
    if (pausedRows.length && !rows.length) {
      setBanner({
        kind: "err",
        text: `${pausedRows.map((row) => row.label).join(", ")} ${
          pausedRows.length === 1 ? "is" : "are"
        } paused until Pro. Upgrade to send.`,
      });
      return;
    }
    if (!rows.length) {
      setBanner({ kind: "err", text: "Connect and select a channel first." });
      return;
    }
    if (action === "schedule" && !when) {
      setBanner({ kind: "err", text: "Pick an IST time first." });
      return;
    }
    if (action !== "draft" && mediaWarning) {
      setBanner({ kind: "err", text: mediaWarning });
      return;
    }

    const contentByPlatform: Record<string, string> = {};
    for (const row of rows) {
      if (overrides[row.platform] !== undefined) {
        contentByPlatform[row.platform] = overrides[row.platform];
      }
    }
    const mediaByPlatformPayload: Record<string, string[]> = {};
    for (const row of rows) {
      const files = perFeed[row.platform];
      if (!files?.length) continue;
      const urls = files
        .filter((item) => item.url.startsWith("http"))
        .map((item) => item.url);
      const shared = media
        .filter((item) => item.url.startsWith("http"))
        .map((item) => item.url);
      if (urls.length && urls.join("\0") !== shared.join("\0")) {
        mediaByPlatformPayload[row.platform] = urls;
      }
    }

    if (loadedStatus === "PUBLISHING") {
      setBanner({
        kind: "err",
        text: "That post is sending. Wait a moment, then try again.",
      });
      return;
    }

    pending.current = true;
    setBusy(action);
    setBanner(null);
    try {
      const editing = Boolean(editingId);
      const post = await api<SavedPost>(
        editing ? `/posts/${editingId}` : "/posts",
        {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify({
            action,
            content: globalDraft,
            contentByPlatform,
            platforms: rows.map((row) => row.platform),
            scheduledAt: when ? new Date(when).toISOString() : null,
            mediaUrls: media
              .filter((item) => item.url.startsWith("http"))
              .map((item) => item.url),
            mediaByPlatform: mediaByPlatformPayload,
            mediaAlt: mediaAltPayload(media, perFeed),
            settingsByPlatform: Object.fromEntries(
              rows.map((row) => [
                row.platform,
                settingsByPlatform[row.platform] ?? {},
              ]),
            ),
          }),
        },
      );
      const nextStatus =
        action === "draft" ? "DRAFT" : action === "schedule" ? "SCHEDULED" : post.status;
      track("post_saved", {
        action,
        editing,
        platforms: rows.map((row) => row.platform),
        has_media: media.some((item) => item.url.startsWith("http")),
      });
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
    if (block()) return;
    if (pending.current || busy) return;
    const rows = selectedRows.filter((row) => liveAccount(row));
    const pausedRows = selectedRows.filter((row) => row.account?.pausedByPlan);
    if (pausedRows.length && !rows.length) {
      setBanner({
        kind: "err",
        text: `${pausedRows.map((row) => row.label).join(", ")} ${
          pausedRows.length === 1 ? "is" : "are"
        } paused until Pro. Upgrade to send.`,
      });
      return;
    }
    if (!rows.length) {
      setBanner({ kind: "err", text: "Connect and select a channel first." });
      return;
    }
    if (mediaWarning) {
      setBanner({ kind: "err", text: mediaWarning });
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

  const noneConnected = selectedRows.every((row) => !liveAccount(row));
  const noneSelected = selectedRows.length === 0 || noneConnected;
  const noAccounts = live.length > 0 && live.every((row) => !liveAccount(row));
  const locked = Boolean(busy);
  const sending = busy === "draft" || busy === "schedule" || busy === "now";
  const sendChannels = selectedRows
    .filter((row) => liveAccount(row))
    .map((row) => row.label)
    .join(", ");

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-line px-5 py-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {editingId
              ? loadedStatus === "FAILED"
                ? "Fix post"
                : "Edit post"
              : initialPostId
                ? "Duplicate"
                : "Compose"}
          </h1>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">
            {editingId
              ? loadedStatus === "SCHEDULED"
                ? "Updates the queued post · not a copy"
                : loadedStatus === "FAILED"
                  ? "Saves this post, then send again"
                  : "Saves this draft · not a copy"
              : initialPostId
                ? "Creates a new post from this one"
                : "Write once · see every feed"}
          </p>
          <p className="mt-1 text-[11px] font-semibold normal-case tracking-normal text-muted">
            {quotaLine(user, imageLeft, aiLeft)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <IstDateTimePicker value={when} onChange={setWhen} />
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
        <section
          className="relative min-h-0 overflow-y-auto p-5"
          onDragEnter={onEditorDragEnter}
          onDragLeave={onEditorDragLeave}
          onDragOver={onEditorDragOver}
          onDrop={onEditorDrop}
        >
          {fileOver ? (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-background/80 px-6">
              <p className="rounded-xl border border-accent bg-card px-4 py-3 text-center text-sm font-bold text-accent">
                Drop photos or an MP4 here. Schedule still uses the IST time
                above.
              </p>
            </div>
          ) : null}
          {lapsed ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-accent">
                  Trial ended
                </p>
                <p className="mt-0.5 text-sm font-semibold">
                  {PAY_TO_USE} LinkedIn, X, and the rest of the grid wait on Pro.
                </p>
              </div>
              <button
                type="button"
                onClick={() => block()}
                className="shrink-0 rounded-xl bg-accent px-3 py-2 text-sm font-bold text-accent-fg"
              >
                See Pro
              </button>
            </div>
          ) : noAccounts ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-accent">
                  Connect a channel first
                </p>
                <p className="mt-0.5 text-sm font-semibold">
                  Compose can preview, but it cannot send until LinkedIn or X
                  is connected.
                </p>
              </div>
              <Link
                href="/accounts?from=start"
                className="shrink-0 rounded-xl bg-accent px-3 py-2 text-sm font-bold text-accent-fg"
              >
                Connect a channel
              </Link>
            </div>
          ) : null}
          <div className="mb-4 flex flex-wrap gap-2">
            {live.map((row) => {
              const account = liveAccount(row);
              return (
              <ChannelChip
                key={row.platform}
                slug={row.slug}
                label={row.label}
                on={Boolean(selected[row.platform])}
                handle={account?.username}
                locked={!account}
                paused={Boolean(row.account?.pausedByPlan)}
                pinned={Boolean(pinnedPlatforms[row.platform])}
                onToggle={() => toggle(row.platform)}
              />
              );
            })}
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
                Add photos or video{busy === "upload" ? "…" : ""}
                <input
                  type="file"
                  accept={MEDIA_FILE_ACCEPT}
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const list = e.target.files ? Array.from(e.target.files) : [];
                    e.target.value = "";
                    void onPickFiles(list);
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  if (block()) return;
                  setLibraryOpen(true);
                }}
                disabled={Boolean(busy)}
                className="rounded-lg px-2 py-1 text-sm font-semibold hover:bg-background disabled:opacity-40"
              >
                From library
              </button>
              <button
                type="button"
                onClick={requestImage}
                disabled={Boolean(busy)}
                className="rounded-lg px-2 py-1 text-sm font-semibold hover:bg-background disabled:opacity-40"
              >
                Generate image
                <span className="ml-1 text-[10px] font-extrabold uppercase text-accent">
                  {`${imageLeft ?? 0} left`}
                </span>
              </button>
              {hasMedia ? (
                <button
                  type="button"
                  onClick={() => replaceMedia([])}
                  className="text-xs font-semibold text-muted hover:text-today"
                >
                  Remove all
                </button>
              ) : null}
            </div>
            <textarea
              ref={area}
              value={activeValue}
              onChange={(e) => setActive(e.target.value)}
              rows={hasMedia ? 3 : 10}
              placeholder={
                PLACEHOLDERS[tab] ||
                "Write once. We’ll show every selected feed on the right."
              }
              className={`w-full resize-y bg-transparent px-4 pt-3 text-base leading-relaxed outline-none placeholder:text-muted ${
                hasMedia ? "min-h-[72px] pb-2" : "min-h-[180px] pb-3"
              }`}
            />
            {!hasMedia ? (
              <p className="mx-4 mb-3 rounded-xl border border-dashed border-line px-3 py-5 text-center text-sm font-semibold text-muted">
                Drop photos or an MP4 here, then Schedule or Post now.
              </p>
            ) : null}
            {hasMedia ? (
              <div className="px-4 pb-3">
                <div
                  className={`grid gap-2 ${
                    media.length === 1 ? "max-w-md grid-cols-1" : "grid-cols-2 max-w-lg"
                  }`}
                >
                  {media.map((item) => (
                    <div key={item.url} className="space-y-1.5">
                    <div
                      className="relative overflow-hidden rounded-xl border border-line"
                    >
                      {mediaKind(item.mimeType) === "video" ? (
                        <video
                          src={item.url}
                          className="max-h-52 w-full object-cover"
                          controls
                          playsInline
                          muted
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.url}
                          alt={item.alt?.trim() || "Attached to this post"}
                          className="max-h-52 w-full object-cover"
                        />
                      )}
                      {mediaKind(item.mimeType) === "image" ? (
                        <button
                          type="button"
                          onClick={() => openCrop(item)}
                          className="absolute left-2 top-2 rounded-lg bg-background/90 px-2 py-1 text-xs font-bold hover:bg-accent hover:text-accent-fg"
                        >
                          Crop
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() =>
                          replaceMedia(
                            media.filter((row) => row.url !== item.url),
                            item,
                          )
                        }
                        className="absolute right-2 top-2 rounded-lg bg-background/90 px-2 py-1 text-xs font-bold hover:bg-today hover:text-white"
                      >
                        Remove
                      </button>
                    </div>
                    {canSetAlt(item) ? (
                      <AltField
                        value={item.alt ?? ""}
                        onChange={(value) => setStillAlt(item, value)}
                      />
                    ) : null}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] font-semibold text-muted">
                  Drop files here or click Add. Up to 4 photos, or one GIF, or
                  one MP4 (max 50 MB, 2:20). iPhone HEIC converts on upload.
                  Slack and Dev.to skip video.
                </p>
                {frameStill && selectedRows.length > 1 ? (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">
                      Frame per feed
                    </p>
                    <p className="text-[11px] font-semibold text-muted">
                      Same crop goes to every channel until you frame one.
                    </p>
                    {selectedRows.map((row) => {
                      const custom = Boolean(perFeed[row.platform]?.length);
                      const thumb = mediaForPlatform(
                        media,
                        perFeed,
                        row.platform,
                      ).find((item) => mediaKind(item.mimeType) === "image");
                      return (
                        <div
                          key={row.platform}
                          className="flex items-center gap-2 rounded-lg border border-line px-2 py-1.5"
                        >
                          <ChannelIcon slug={row.slug} className="size-6 rounded-md" />
                          <span className="min-w-0 flex-1 truncate text-xs font-bold">
                            {row.label}
                          </span>
                          <span className="text-[10px] font-semibold text-muted">
                            {custom ? "This feed" : "Same crop"}
                          </span>
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumb.url}
                              alt=""
                              className="size-8 rounded object-cover"
                            />
                          ) : null}
                          <button
                            type="button"
                            onClick={() =>
                              openCrop(thumb ?? frameStill, row.platform)
                            }
                            className="rounded-md px-2 py-1 text-[11px] font-bold hover:bg-background"
                          >
                            Frame
                          </button>
                          {custom ? (
                            <button
                              type="button"
                              onClick={() =>
                                setMediaByPlatform((prev) => {
                                  const copy = { ...prev };
                                  delete copy[row.platform];
                                  return copy;
                                })
                              }
                              className="rounded-md px-2 py-1 text-[11px] font-semibold text-muted hover:text-foreground"
                            >
                              Use shared
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
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
                      {(row.platform === "TELEGRAM" && hasMedia
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
            {tab !== "all" ? (
              <ChannelSettingsPanel
                platform={tab}
                settings={settingsByPlatform[tab] ?? {}}
                stillCount={stills.length}
                onChange={(next) =>
                  setSettingsByPlatform((prev) => {
                    const copy = { ...prev };
                    if (Object.keys(next).length) copy[tab] = next;
                    else delete copy[tab];
                    return copy;
                  })
                }
              />
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void runVariations()}
              className="rounded-xl bg-accent px-3 py-2 text-sm font-bold text-accent-fg"
            >
              {busy === "write" ? "Writing…" : `Write with AI · ${aiLeft ?? 0} left`}
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

          {mediaWarning ? (
            <p className="mt-3 rounded-xl border border-today/40 bg-today/10 px-3 py-2 text-sm font-semibold text-today">
              {mediaWarning}
            </p>
          ) : null}

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
                {aiSource === "haiku"
                  ? "AI"
                  : aiSource === "claude"
                    ? "Claude"
                    : "Sample"}{" "}
                · tap to use
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
                {busy === "draft" ? "Saving…" : "Save draft"}
              </button>
              <button
                type="button"
                disabled={anyOver || Boolean(mediaWarning) || noneSelected || locked}
                aria-busy={busy === "schedule"}
                onClick={() => void submit("schedule")}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-fg disabled:cursor-wait disabled:opacity-40"
              >
                {busy === "schedule" ? <Spinner /> : null}
                {busy === "schedule"
                  ? editingId
                    ? "Updating queue…"
                    : "Scheduling…"
                  : editingId && loadedStatus === "SCHEDULED"
                    ? "Update schedule"
                    : "Schedule"}
              </button>
              <button
                type="button"
                disabled={anyOver || Boolean(mediaWarning) || noneSelected || locked}
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
              const canSend = Boolean(liveAccount(row));
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
                    {account?.pausedByPlan
                      ? " · paused until Pro"
                      : !canSend
                        ? " · preview only"
                        : ""}
                  </p>
                  <ChannelPreview
                    platform={row.platform}
                    name={account?.displayName || name}
                    handle={account?.username || row.slug}
                    avatar={account?.avatar ?? null}
                    body={body}
                    media={mediaForPlatform(media, perFeed, row.platform)}
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

      <MediaLibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        current={media}
        onChange={(next, note) => {
          const still = lastNewStill(media, next);
          replaceMedia(next);
          if (note) setBanner({ kind: "ok", text: note });
          if (still) openCrop(still);
        }}
      />

      <ImageEditorDialog
        item={cropItem}
        platforms={cropPlatform ? [cropPlatform] : selectedPlatforms}
        feedLabel={
          cropPlatform
            ? selectedRows.find((row) => row.platform === cropPlatform)?.label
            : undefined
        }
        altText={
          cropItem
            ? (media.find((row) => sameStill(row, cropItem))?.alt ??
              cropItem.alt ??
              "")
            : ""
        }
        onAltText={(value) => {
          if (cropItem) setStillAlt(cropItem, value);
        }}
        busy={Boolean(busy)}
        onClose={closeCrop}
        onApplied={applyCrop}
        onError={(message) => setBanner({ kind: "err", text: message })}
      />

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
              .filter((row) => liveAccount(row))
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
  paused,
  pinned,
  onToggle,
}: {
  slug: string;
  label: string;
  on: boolean;
  handle: string | null | undefined;
  locked: boolean;
  paused?: boolean;
  pinned?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pinned}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${
        on ? "bg-accent text-accent-fg" : "border border-line text-muted"
      } ${pinned ? "cursor-not-allowed opacity-90" : ""}`}
    >
      <ChannelIcon slug={slug} className="size-4 rounded-md" />
      {label}
      {paused ? (
        <span className="text-[10px] font-extrabold uppercase opacity-70">
          paused
        </span>
      ) : handle ? (
        <span className="font-semibold opacity-80">
          {handle.startsWith("@") ? handle : `@${handle}`}
        </span>
      ) : on ? (
        <span className="text-[10px] font-extrabold uppercase opacity-70">
          {pinned ? "sent" : "preview"}
        </span>
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

function AltField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, MAX_ALT_TEXT))}
        rows={2}
        placeholder="Alt text for LinkedIn and X"
        className="w-full resize-y rounded-lg border border-line bg-transparent px-2.5 py-1.5 text-xs font-semibold leading-snug outline-none placeholder:text-muted"
      />
      <p className="mt-0.5 text-right text-[10px] font-semibold text-muted">
        {value.trim().length.toLocaleString("en-IN")} /{" "}
        {MAX_ALT_TEXT.toLocaleString("en-IN")}
      </p>
    </div>
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
  media?: Array<{
    url: string;
    mimeType: string;
    id?: string;
    sourceId?: string;
    sourceUrl?: string;
    alt?: string;
  }>;
  mediaByPlatform?: Record<
    string,
    Array<{
      url: string;
      mimeType: string;
      id?: string;
      sourceId?: string;
      sourceUrl?: string;
      alt?: string;
    }>
  >;
  status: string;
  scheduledAt: string | null;
  failedReason: string | null;
  settingsByPlatform?: Record<string, ChannelSettings>;
  targets: Array<{
    platform: string;
    status: string;
    platformPostId?: string | null;
    failedReason: string | null;
    settings?: ChannelSettings;
    media?: Array<{
      url: string;
      mimeType: string;
      id?: string;
      sourceId?: string;
      sourceUrl?: string;
      alt?: string;
    }>;
  }>;
};

function canPatchLoaded(post: SavedPost) {
  if (post.status === "PUBLISHING") return false;
  if (
    post.status === "DRAFT" ||
    post.status === "SCHEDULED" ||
    post.status === "FAILED"
  ) {
    return true;
  }
  return post.targets.some((target) => target.status === "FAILED");
}
