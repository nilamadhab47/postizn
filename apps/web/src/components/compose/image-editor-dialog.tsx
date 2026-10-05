"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type PercentCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  CROP_CHIPS,
  defaultCropAspect,
  type CropAspectId,
  type CropChip,
} from "@postn/shared";
import { api, apiBlob, ApiError } from "@/lib/api";
import { naturalPixels, transformPreview } from "@/lib/crop-image";
import { smartFrameBox } from "@/lib/smart-frame";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FlipHorizontal2, RotateCcw, RotateCw, Sparkles, ZoomIn, ZoomOut } from "lucide-react";
import type { ComposeMedia } from "@/lib/compose-media";

type StoredMedia = ComposeMedia & { parentId?: string | null };

type Props = {
  item: ComposeMedia | null;
  platforms: string[];
  feedLabel?: string;
  busy: boolean;
  onClose: () => void;
  onApplied: (next: ComposeMedia) => void;
  onError: (message: string) => void;
};

export function ImageEditorDialog({ item, platforms, ...rest }: Props) {
  if (!item) return null;
  return (
    <ImageEditorBody
      key={`${item.sourceUrl ?? item.url}:${platforms.join(",")}`}
      item={item}
      platforms={platforms}
      {...rest}
    />
  );
}

function aspectFor(chip: CropChip, naturalWidth: number, naturalHeight: number) {
  if (chip.id === "custom") return undefined;
  if (chip.id === "original") {
    return naturalWidth > 0 && naturalHeight > 0 ? naturalWidth / naturalHeight : 1;
  }
  return chip.ratio ?? 1;
}

function makeCenteredCrop(
  naturalWidth: number,
  naturalHeight: number,
  aspect?: number,
): PercentCrop {
  if (!aspect) {
    return centerCrop({ unit: "%", width: 80, height: 80 }, naturalWidth, naturalHeight);
  }
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, aspect, naturalWidth, naturalHeight),
    naturalWidth,
    naturalHeight,
  );
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));
}

function ImageEditorBody({
  item,
  platforms,
  feedLabel,
  busy,
  onClose,
  onApplied,
  onError,
}: Props & { item: ComposeMedia }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const [localSrc, setLocalSrc] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    src: string;
    rotation: number;
    flipX: boolean;
  } | null>(null);
  const [crop, setCrop] = useState<PercentCrop>();
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [aspectId, setAspectId] = useState<CropAspectId>(() =>
    defaultCropAspect(platforms),
  );
  const [applying, setApplying] = useState(false);
  const [smarting, setSmarting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const chip = CROP_CHIPS.find((row) => row.id === aspectId) ?? CROP_CHIPS[1];
  const aspect = useMemo(
    () => aspectFor(chip, natural?.w ?? 0, natural?.h ?? 0),
    [chip, natural],
  );
  const display = useMemo(() => {
    if (!natural || stage.w < 8 || stage.h < 8) return null;
    const fit = Math.min(stage.w / natural.w, stage.h / natural.h);
    return {
      w: Math.max(1, natural.w * fit * zoom),
      h: Math.max(1, natural.h * fit * zoom),
    };
  }, [natural, stage, zoom]);

  useEffect(() => {
    const original = item.sourceUrl ?? item.url;
    let objectUrl: string | null = null;
    let cancelled = false;
    void (async () => {
      try {
        let blob: Blob;
        try {
          blob = await apiBlob(`/media/file?url=${encodeURIComponent(original)}`);
        } catch (err) {
          if (cancelled) return;
          if (original === item.url) throw err;
          blob = await apiBlob(`/media/file?url=${encodeURIComponent(item.url)}`);
        }
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setLocalSrc(objectUrl);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.message : "Could not open that photo");
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.sourceUrl, item.url]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box) return;
      setStage((prev) =>
        Math.abs(prev.w - box.width) < 0.5 && Math.abs(prev.h - box.height) < 0.5
          ? prev
          : { w: box.width, h: box.height },
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const step = event.ctrlKey || event.metaKey ? 0.18 : 0.12;
      const next = clampZoom(zoomRef.current + (event.deltaY > 0 ? -step : step));
      if (next === zoomRef.current) return;
      const rect = el.getBoundingClientRect();
      const ox = event.clientX - rect.left;
      const oy = event.clientY - rect.top;
      const ratio = next / zoomRef.current;
      el.scrollLeft = (el.scrollLeft + ox) * ratio - ox;
      el.scrollTop = (el.scrollTop + oy) * ratio - oy;
      setZoom(next);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const deg = ((Math.round(rotation) % 360) + 360) % 360;
  const needsTransform = deg !== 0 || flipX;
  const viewSrc = !needsTransform
    ? localSrc
    : preview && preview.rotation === rotation && preview.flipX === flipX
      ? preview.src
      : null;

  useEffect(() => {
    if (!localSrc || !needsTransform) return;
    let created: string | null = null;
    let cancelled = false;
    void transformPreview(localSrc, rotation, flipX)
      .then((next) => {
        if (cancelled) {
          if (next !== localSrc) URL.revokeObjectURL(next);
          return;
        }
        created = next;
        setPreview({ src: next, rotation, flipX });
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not rotate that photo");
      });
    return () => {
      cancelled = true;
      if (created && created !== localSrc) URL.revokeObjectURL(created);
    };
  }, [localSrc, rotation, flipX, needsTransform]);

  function placeCrop(nextChip: CropChip, image = imgRef.current) {
    if (!image?.naturalWidth) return;
    setCrop(
      makeCenteredCrop(
        image.naturalWidth,
        image.naturalHeight,
        aspectFor(nextChip, image.naturalWidth, image.naturalHeight),
      ),
    );
  }

  function onImageLoad(event: React.SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget;
    setNatural({ w: image.naturalWidth, h: image.naturalHeight });
    placeCrop(chip, image);
  }

  function selectChip(next: CropChip) {
    setAspectId(next.id);
    placeCrop(next);
  }

  function changeZoom(next: number) {
    setZoom(clampZoom(next));
  }

  function rotateBy(delta: number) {
    setZoom(1);
    setRotation((deg) => deg + delta);
  }

  async function smartFrame() {
    if (!viewSrc || smarting || applying) return;
    setSmarting(true);
    try {
      const image = imgRef.current;
      const nw = image?.naturalWidth ?? 1;
      const nh = image?.naturalHeight ?? 1;
      const locked = aspectFor(chip, nw, nh);
      const current = crop
        ? ((crop.width / 100) * nw) / Math.max(1, (crop.height / 100) * nh)
        : 1;
      const next = await smartFrameBox(viewSrc, locked ?? current);
      setCrop(next);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not find a subject");
    } finally {
      setSmarting(false);
    }
  }

  async function apply() {
    const image = imgRef.current;
    if (!crop || !image?.naturalWidth || applying || busy) return;
    setApplying(true);
    try {
      const pixels = naturalPixels(crop, image.naturalWidth, image.naturalHeight);
      const stored = await api<StoredMedia>("/media/derive", {
        method: "POST",
        body: JSON.stringify({
          id: item.sourceId ?? item.id,
          url: item.sourceUrl ?? item.url,
          aspect: aspectId,
          zoom: 1,
          rotation,
          flipX,
          flipY: false,
          crop: pixels,
        }),
      });
      onApplied({
        id: stored.id,
        url: stored.url,
        mimeType: stored.mimeType || "image/jpeg",
        sourceId: stored.sourceId ?? stored.parentId ?? item.sourceId ?? item.id,
        sourceUrl: stored.sourceUrl ?? item.sourceUrl ?? item.url,
      });
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Could not save that crop");
    } finally {
      setApplying(false);
    }
  }

  const blocked = applying || busy;
  const canSmart = Boolean(viewSrc && crop && !loadError);

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (typeof next === "boolean" && !next && !blocked) onClose();
      }}
    >
      <DialogContent
        className="z-[80] gap-3 sm:max-w-2xl"
        overlayClassName="z-[80]"
        showCloseButton={!blocked}
      >
        <DialogHeader>
          <DialogTitle>
            {feedLabel ? `Frame for ${feedLabel}` : "Frame the photo"}
          </DialogTitle>
          <DialogDescription>
            {feedLabel
              ? `This crop only goes to ${feedLabel}. Other channels keep the shared crop until you frame them.`
              : "Drag the box to pick a region. Pull a corner to resize. Zoom the photo to see the whole still or a detail. Skip keeps the original on the post."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1">
          {CROP_CHIPS.map((row) => (
            <ChipButton
              key={row.id}
              chip={row}
              on={aspectId === row.id}
              onClick={() => selectChip(row)}
            />
          ))}
        </div>

        <div
          ref={stageRef}
          className="crop-stage h-[min(56vh,420px)] overflow-auto rounded-xl border border-line bg-background"
        >
          {loadError ? (
            <p className="flex h-full items-center justify-center px-4 text-center text-sm font-semibold text-muted">
              {loadError}
            </p>
          ) : viewSrc ? (
            <div
              className="flex items-center justify-center"
              style={{
                minWidth: "100%",
                minHeight: "100%",
                width: display ? Math.max(display.w, stage.w) : "100%",
                height: display ? Math.max(display.h, stage.h) : "100%",
              }}
            >
              <ReactCrop
                crop={crop}
                aspect={aspect}
                onChange={(_, percent) => setCrop(percent)}
                keepSelection
                ruleOfThirds
                minWidth={24}
                minHeight={24}
                disabled={blocked}
                renderSelectionAddon={() =>
                  chip.id === "linkedin" || chip.id === "x" ? (
                    <SafeGhost chipId={chip.id} />
                  ) : null
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={viewSrc}
                  alt="Photo to frame"
                  className="max-h-none max-w-none"
                  style={
                    display
                      ? { width: display.w, height: display.h }
                      : { maxHeight: "min(56vh, 420px)", maxWidth: "100%" }
                  }
                  onLoad={onImageLoad}
                />
              </ReactCrop>
            </div>
          ) : (
            <p className="flex h-full items-center justify-center text-sm font-semibold text-muted">
              Loading photo…
            </p>
          )}
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-muted">
          Zoom
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="size-8 p-0"
            onClick={() => changeZoom(zoom - 0.25)}
            disabled={blocked || zoom <= MIN_ZOOM}
            aria-label="Zoom out"
          >
            <ZoomOut />
          </Button>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.05}
            value={zoom}
            disabled={blocked}
            onChange={(e) => changeZoom(Number(e.target.value))}
            className="h-1.5 flex-1 accent-[var(--accent)]"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="size-8 p-0"
            onClick={() => changeZoom(zoom + 0.25)}
            disabled={blocked || zoom >= MAX_ZOOM}
            aria-label="Zoom in"
          >
            <ZoomIn />
          </Button>
          <span className="w-10 text-right">{Math.round(zoom * 100)}%</span>
        </label>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void smartFrame()}
            disabled={!canSmart || blocked || smarting}
          >
            <Sparkles />
            {smarting ? "Framing…" : "Smart Frame"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => rotateBy(-90)}
            disabled={blocked}
          >
            <RotateCcw />
            Rotate
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => rotateBy(90)}
            disabled={blocked}
          >
            <RotateCw />
            Rotate
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFlipX((on) => !on)}
            disabled={blocked}
          >
            <FlipHorizontal2 />
            Flip
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={blocked}>
            Skip
          </Button>
          <Button
            type="button"
            onClick={() => void apply()}
            disabled={blocked || !crop || Boolean(loadError)}
          >
            {applying ? "Saving…" : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChipButton({
  chip,
  on,
  onClick,
}: {
  chip: CropChip;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
        on ? "bg-accent text-accent-fg" : "border border-line text-muted"
      }`}
    >
      {chip.label}
    </button>
  );
}

function SafeGhost({ chipId }: { chipId: CropAspectId }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="relative aspect-square h-full max-w-full border border-dashed border-white/80">
        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          {chipId === "linkedin" ? "LI mobile" : "Centre · X/LI mobile"}
        </span>
      </div>
    </div>
  );
}
