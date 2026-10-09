import { mediaKind, type MediaRef } from "@postn/shared";
import { sniffUploadMime } from "../../media/sniff-upload";
import type { StorageService } from "../../storage/storage.service";
import type { PublishInput } from "./base-provider";
import { assertSafeMediaUrl } from "./safe-fetch";

export async function fetchRemoteFile(url: string, storage: StorageService) {
  const owned = await storage.loadOwnedObject(url);
  if (owned) {
    return {
      buffer: owned.buffer,
      mimeType: sniffUploadMime(owned.buffer) ?? owned.mimeType,
    };
  }

  await assertSafeMediaUrl(url, storage.allowedFetchHosts());
  const res = await fetch(url, { redirect: "error" });
  if (!res.ok) {
    throw new Error("Could not fetch the attached file");
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const mimeType = (res.headers.get("content-type") ?? "application/octet-stream")
    .split(";")[0]
    .trim()
    .toLowerCase();
  return { buffer, mimeType };
}

export function itemsFromPublish(input: PublishInput): MediaRef[] {
  if (input.media?.length) {
    return input.media.filter((item) => item.url);
  }
  return (input.mediaUrls ?? [])
    .filter(Boolean)
    .map((url) => ({ url, mimeType: "image/jpeg", bytes: 0 }));
}

export function firstKind(items: MediaRef[]) {
  return items[0] ? mediaKind(items[0].mimeType) : null;
}
