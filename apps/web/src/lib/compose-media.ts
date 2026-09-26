import {
  MAX_POST_MEDIA,
  MAX_VIDEO_SECONDS,
  MIN_VIDEO_SECONDS,
  mediaKind,
} from "@postn/shared";

export type ComposeMedia = {
  url: string;
  mimeType: string;
};

export const MEDIA_FILE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4";

const ACCEPT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
]);

export function isFileDrag(event: { dataTransfer?: DataTransfer | null }) {
  const types = event.dataTransfer?.types;
  if (!types) return false;
  return Array.from(types).includes("Files");
}

export function acceptedFiles(list: FileList | File[] | null | undefined) {
  if (!list) return [];
  return Array.from(list).filter(
    (file) =>
      ACCEPT_TYPES.has(file.type) ||
      /\.(jpe?g|png|webp|gif|mp4)$/i.test(file.name),
  );
}

export function mergePicked(current: ComposeMedia[], incoming: ComposeMedia[]) {
  const incomingKinds = incoming.map((item) => mediaKind(item.mimeType));
  if (incomingKinds.includes("video")) {
    const video = incoming.find((item) => mediaKind(item.mimeType) === "video")!;
    return {
      next: [video],
      note: current.length
        ? "Video replaced the other files. Feeds take photos or one video."
        : undefined,
    };
  }
  if (incomingKinds.includes("gif")) {
    const gif = incoming.find((item) => mediaKind(item.mimeType) === "gif")!;
    return {
      next: [gif],
      note: current.length
        ? "GIF replaced the other files. One GIF per post."
        : undefined,
    };
  }
  const stills = [
    ...current.filter((item) => mediaKind(item.mimeType) === "image"),
    ...incoming.filter((item) => mediaKind(item.mimeType) === "image"),
  ].slice(0, MAX_POST_MEDIA);
  const overflow =
    current.filter((item) => mediaKind(item.mimeType) === "image").length +
      incoming.filter((item) => mediaKind(item.mimeType) === "image").length >
    MAX_POST_MEDIA;
  const replacedExclusive = current.some(
    (item) => mediaKind(item.mimeType) !== "image",
  );
  return {
    next: stills,
    note: overflow
      ? "Capped at 4 photos"
      : replacedExclusive
        ? "Photos replaced the video."
        : undefined,
  };
}

export function videoSeconds(file: File) {
  const url = URL.createObjectURL(file);
  return new Promise<number>((resolve, reject) => {
    const el = document.createElement("video");
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      const duration = Number.isFinite(el.duration) ? el.duration : 0;
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that video"));
    };
    el.src = url;
  });
}

export function videoLengthError(seconds: number, linkedInSelected: boolean) {
  if (seconds > MAX_VIDEO_SECONDS) {
    return "Keep video under 2 minutes 20 seconds";
  }
  if (linkedInSelected && seconds < MIN_VIDEO_SECONDS) {
    return "LinkedIn needs at least 3 seconds of video";
  }
  return null;
}
