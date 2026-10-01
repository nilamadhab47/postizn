"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { mediaKind } from "@postn/shared";
import type { ComposeMedia } from "@/lib/compose-media";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type LibraryItem = {
  id: string;
  url: string;
  fileName: string;
  bytes: number;
  mimeType?: string;
};

export function MediaLibraryDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (items: ComposeMedia[]) => void;
}) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    setPicked({});
    setError(null);
    setLoading(true);
    void api<{ configured: boolean; items: LibraryItem[] }>("/media")
      .then((data) => {
        setConfigured(data.configured);
        setItems(data.items);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not load media"),
      )
      .finally(() => setLoading(false));
  }, [open]);

  const selected = items.filter((item) => picked[item.id]);

  function toggle(item: LibraryItem) {
    setPicked((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
  }

  function confirm() {
    if (!selected.length) return;
    onPick(
      selected.map((item) => ({
        url: item.url,
        mimeType: item.mimeType ?? "image/jpeg",
      })),
    );
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (typeof next === "boolean") onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-3xl" showCloseButton>
        <DialogHeader>
          <DialogTitle>Pick from library</DialogTitle>
          <DialogDescription>
            Files already in Media. Photos stack up to 4; a GIF or MP4 replaces
            the rest.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="text-sm font-semibold text-muted">Loading library…</p>
        ) : error ? (
          <p className="text-sm font-semibold text-today">{error}</p>
        ) : !configured ? (
          <p className="rounded-xl border border-today/40 bg-today/10 px-3 py-2 text-sm text-today">
            R2 is not configured, so there is nothing to pick yet.
          </p>
        ) : items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm font-semibold text-muted">
            Library is empty. Upload or drop a file on Compose first.
          </p>
        ) : (
          <ul className="grid max-h-[min(420px,50vh)] gap-2 overflow-y-auto sm:grid-cols-3">
            {items.map((item) => {
              const on = Boolean(picked[item.id]);
              const video = mediaKind(item.mimeType ?? "") === "video";
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => toggle(item)}
                    className={`w-full overflow-hidden rounded-2xl border text-left ${
                      on ? "border-accent ring-2 ring-accent/40" : "border-line"
                    }`}
                  >
                    {video ? (
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
                    <span className="flex items-center justify-between gap-2 px-2 py-1.5">
                      <span className="truncate text-[11px] font-semibold">
                        {item.fileName}
                      </span>
                      {on ? (
                        <span className="text-[10px] font-extrabold uppercase text-accent">
                          On
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            className="border-line bg-transparent hover:bg-card hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button disabled={!selected.length} onClick={confirm}>
            Add {selected.length ? selected.length : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
