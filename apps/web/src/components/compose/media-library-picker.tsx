"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { mediaKind } from "@postn/shared";
import { mergePicked, type ComposeMedia } from "@/lib/compose-media";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type LibraryItem = {
  id: string;
  url: string;
  fileName: string;
  mimeType?: string;
  bytes: number;
  sourceId?: string | null;
  sourceUrl?: string | null;
};

export function MediaLibraryDialog({
  open,
  onOpenChange,
  current,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: ComposeMedia[];
  onChange: (next: ComposeMedia[], note?: string) => void;
}) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    void api<{ items: LibraryItem[] }>("/media")
      .then((data) => setItems(data.items))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not load library"),
      )
      .finally(() => setLoading(false));
  }, [open]);

  const attached = new Set(current.map((item) => item.url));

  function pick(item: LibraryItem) {
    const incoming: ComposeMedia[] = [
      {
        id: item.id,
        url: item.url,
        mimeType: item.mimeType ?? "image/jpeg",
        sourceId: item.sourceId ?? undefined,
        sourceUrl: item.sourceUrl ?? undefined,
      },
    ];
    if (attached.has(item.url)) {
      onChange(current.filter((row) => row.url !== item.url));
      return;
    }
    const merged = mergePicked(current, incoming);
    onChange(merged.next, merged.note);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (typeof next === "boolean") onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-2xl" showCloseButton>
        <DialogHeader>
          <DialogTitle>Media library</DialogTitle>
          <DialogDescription>
            Tap a file to attach it. Photos stack up to 4; a GIF or MP4 replaces
            the rest.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="rounded-xl border border-today/40 bg-today/10 px-3 py-2 text-sm font-semibold text-today">
            {error}
          </p>
        ) : null}
        {loading ? (
          <p className="text-sm font-semibold text-muted">Loading files…</p>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm font-semibold text-muted">
            Nothing in the library yet. Upload from the toolbar or drop a file
            into the editor.
          </p>
        ) : (
          <div className="grid max-h-[min(420px,50vh)] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-4">
            {items.map((item) => {
              const on = attached.has(item.url);
              const kind = mediaKind(item.mimeType ?? "");
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => pick(item)}
                  className={`relative overflow-hidden rounded-xl border text-left ${
                    on ? "border-accent ring-2 ring-accent/40" : "border-line"
                  }`}
                >
                  {kind === "video" ? (
                    <video
                      src={item.url}
                      className="h-28 w-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt={item.fileName}
                      className="h-28 w-full object-cover"
                    />
                  )}
                  <span className="block truncate px-2 py-1.5 text-[11px] font-semibold text-muted">
                    {item.fileName}
                  </span>
                  {on ? (
                    <span className="absolute left-2 top-2 rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-accent-fg">
                      On post
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
