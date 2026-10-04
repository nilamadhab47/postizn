"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { AppHeader } from "@/components/layout/app-header";
import { usePaywall } from "@/lib/use-paywall";
import { mediaKind } from "@postn/shared";
import {
  MEDIA_FILE_ACCEPT,
  acceptedFiles,
  isFileDrag,
} from "@/lib/compose-media";

type MediaItem = {
  id: string;
  url: string;
  fileName: string;
  bytes: number;
  mimeType?: string;
  createdAt: string;
};

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function MediaBoard() {
  const { block } = usePaywall();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [configured, setConfigured] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileOver, setFileOver] = useState(false);
  const fileDragDepth = useRef(0);

  async function refresh() {
    const data = await api<{ configured: boolean; items: MediaItem[] }>("/media");
    setConfigured(data.configured);
    setItems(data.items);
  }

  useEffect(() => {
    void refresh().catch((err) =>
      setError(err instanceof ApiError ? err.message : "Could not load media"),
    );
  }, []);

  async function onPickFiles(files: File[]) {
    if (block()) return;
    const incoming = acceptedFiles(files);
    if (!incoming.length) {
      setError("Use a JPEG, PNG, WebP, HEIC, GIF, or MP4");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      for (const file of incoming) {
        const body = new FormData();
        body.append("file", file);
        await api("/media", { method: "POST", body });
      }
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await api(`/media/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete");
    }
  }

  function onBoardDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!isFileDrag(event) || busy) return;
    event.preventDefault();
    fileDragDepth.current += 1;
    setFileOver(true);
  }

  function onBoardDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!isFileDrag(event)) return;
    fileDragDepth.current = Math.max(0, fileDragDepth.current - 1);
    if (fileDragDepth.current === 0) setFileOver(false);
  }

  function onBoardDragOver(event: DragEvent<HTMLDivElement>) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = busy ? "none" : "copy";
  }

  function onBoardDrop(event: DragEvent<HTMLDivElement>) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    fileDragDepth.current = 0;
    setFileOver(false);
    if (busy) return;
    void onPickFiles(Array.from(event.dataTransfer.files ?? []));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <AppHeader title="Media" />
      <div
        className="relative min-h-0 flex-1 overflow-y-auto p-8"
        onDragEnter={onBoardDragEnter}
        onDragLeave={onBoardDragLeave}
        onDragOver={onBoardDragOver}
        onDrop={onBoardDrop}
      >
        {fileOver ? (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background/80">
            <p className="rounded-xl border border-accent bg-card px-4 py-3 text-sm font-bold text-accent">
              Drop photos or an MP4 to upload
            </p>
          </div>
        ) : null}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-sm text-muted">
            Drop files here or upload. They go to Cloudflare R2 under{" "}
            <span className="font-semibold">postn/</span>. Photos up to 10 MB,
            GIFs 15 MB, MP4 50 MB. iPhone HEIC becomes JPEG.
          </p>
          <label className="cursor-pointer rounded-xl bg-accent px-4 py-2 text-sm font-bold text-accent-fg">
            {busy ? "Uploading…" : "Upload"}
            <input
              type="file"
              accept={MEDIA_FILE_ACCEPT}
              multiple
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const list = e.target.files ? Array.from(e.target.files) : [];
                e.target.value = "";
                void onPickFiles(list);
              }}
            />
          </label>
        </div>
        {error ? <p className="mb-4 text-sm font-semibold text-today">{error}</p> : null}
        {!configured ? (
          <p className="rounded-xl border border-today/40 bg-today/10 px-3 py-2 text-sm text-today">
            R2 is not configured. Add account id, bucket, and keys in apps/api/.env, then restart
            the API.
          </p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
            <p className="text-xl font-bold">No files yet</p>
            <p className="mt-2 text-base text-muted">
              Drop a JPEG, PNG, WebP, HEIC, GIF, or MP4, or click Upload.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <li key={item.id} className="overflow-hidden rounded-2xl border border-line bg-card">
                {mediaKind(item.mimeType ?? "") === "video" ? (
                  <video
                    src={item.url}
                    className="h-40 w-full object-cover"
                    muted
                    playsInline
                    controls
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt={item.fileName} className="h-40 w-full object-cover" />
                )}
                <div className="flex items-center justify-between gap-2 p-3">
                  <p className="truncate text-xs font-semibold">
                    {item.fileName}
                    <span className="ml-1 text-muted">{formatBytes(item.bytes)}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => void remove(item.id)}
                    className="text-xs font-semibold text-muted hover:text-today"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
