"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { AppHeader } from "@/components/layout/app-header";

type MediaItem = {
  id: string;
  url: string;
  fileName: string;
  bytes: number;
  createdAt: string;
};

export function MediaBoard() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [configured, setConfigured] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function onPick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      await api("/media", { method: "POST", body });
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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <AppHeader title="Media" />
      <div className="min-h-0 flex-1 overflow-y-auto p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-sm text-muted">
            Uploads go to Cloudflare R2 under <span className="font-semibold">postn/</span>, then
            the URL is stored on the draft. Reuse a file from here in Compose.
          </p>
          <label className="cursor-pointer rounded-xl bg-accent px-4 py-2 text-sm font-bold text-accent-fg">
            {busy ? "Uploading…" : "Upload image"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              disabled={busy}
              onChange={(e) => void onPick(e.target.files?.[0])}
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
            <p className="text-xl font-bold">No images yet</p>
            <p className="mt-2 text-base text-muted">Upload a JPEG, PNG, WebP, or GIF under 8 MB.</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <li key={item.id} className="overflow-hidden rounded-2xl border border-line bg-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.fileName} className="h-40 w-full object-cover" />
                <div className="flex items-center justify-between gap-2 p-3">
                  <p className="truncate text-xs font-semibold">{item.fileName}</p>
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
