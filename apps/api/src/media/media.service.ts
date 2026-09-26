import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  MAX_VIDEO_BYTES,
  guessMimeFromUrl,
  maxBytesForKind,
  mediaKind,
  type MediaRef,
} from "@postn/shared";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
};

export const UPLOAD_MAX_BYTES = MAX_VIDEO_BYTES;

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  status() {
    return { configured: this.storage.isConfigured() };
  }

  async list(userId: string) {
    const items = await this.prisma.media.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 80,
    });
    return { configured: this.storage.isConfigured(), items: items.map(present) };
  }

  async uploadFile(
    userId: string,
    file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
  ) {
    return this.save(userId, file.buffer, file.mimetype, file.originalname, file.size);
  }

  async uploadDataUrl(userId: string, dataUrl: string, fileName?: string) {
    const match = dataUrl.trim().match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      throw new BadRequestException("That image is not a usable data URL");
    }
    const mimeType = match[1];
    const buffer = Buffer.from(match[2], "base64");
    return this.save(userId, buffer, mimeType, fileName || `generated.${EXT[mimeType] ?? "png"}`, buffer.length);
  }

  async remove(userId: string, id: string) {
    const row = await this.prisma.media.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException("File not found");
    await this.storage.deleteObject(row.key);
    await this.prisma.media.delete({ where: { id: row.id } });
    return { ok: true };
  }

  async ownedForUser(userId: string, urls: string[]): Promise<MediaRef[]> {
    if (!urls.length) return [];
    const unique = [...new Set(urls)];
    const rows = await this.prisma.media.findMany({
      where: { userId, url: { in: unique } },
      select: { url: true, mimeType: true, bytes: true },
    });
    const byUrl = new Map(rows.map((row) => [row.url, row]));
    return urls
      .filter((url) => byUrl.has(url))
      .map((url) => {
        const row = byUrl.get(url)!;
        return { url: row.url, mimeType: row.mimeType, bytes: row.bytes };
      });
  }

  async hydrate(userId: string, urls: string[]): Promise<MediaRef[]> {
    if (!urls.length) return [];
    const rows = await this.prisma.media.findMany({
      where: { userId, url: { in: urls } },
      select: { url: true, mimeType: true, bytes: true },
    });
    const byUrl = new Map(rows.map((row) => [row.url, row]));
    return urls.map((url) => {
      const row = byUrl.get(url);
      return {
        url,
        mimeType: row?.mimeType ?? guessMimeFromUrl(url),
        bytes: row?.bytes ?? 0,
      };
    });
  }

  private async save(
    userId: string,
    body: Buffer,
    mimeType: string,
    originalName: string,
    bytes: number,
  ) {
    if (!this.storage.isConfigured()) {
      throw new BadRequestException("R2 is not configured. Add account id, bucket, and keys, then restart the API.");
    }
    const kind = mediaKind(mimeType);
    if (!kind) {
      throw new BadRequestException("Use JPEG, PNG, WebP, GIF, or MP4");
    }
    const cap = maxBytesForKind(kind);
    if (bytes > cap) {
      throw new BadRequestException(sizeMessage(kind, cap));
    }
    const ext = EXT[mimeType] ?? "bin";
    const fallback = kind === "video" ? `video.${ext}` : `image.${ext}`;
    const safe = originalName.replace(/[^\w.-]+/g, "_").slice(0, 80) || fallback;
    const keyName = `${userId}/${randomUUID()}-${safe.endsWith(`.${ext}`) ? safe : `${safe}.${ext}`}`;
    let stored: { key: string; url: string };
    try {
      stored = await this.storage.putObject(keyName, body, mimeType);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : "R2 upload failed");
    }
    const row = await this.prisma.media.create({
      data: {
        userId,
        key: stored.key,
        url: stored.url,
        mimeType,
        fileName: safe,
        bytes,
      },
    });
    return present(row);
  }
}

function sizeMessage(kind: "image" | "gif" | "video", cap: number) {
  const mb = Math.round(cap / (1024 * 1024));
  if (kind === "video") return `Video must be under ${mb} MB`;
  if (kind === "gif") return `GIF must be under ${mb} MB`;
  return `Photo must be under ${mb} MB`;
}

function present(row: {
  id: string;
  url: string;
  key: string;
  mimeType: string;
  fileName: string;
  bytes: number;
  createdAt: Date;
}) {
  return {
    id: row.id,
    url: row.url,
    key: row.key,
    mimeType: row.mimeType,
    fileName: row.fileName,
    bytes: row.bytes,
    createdAt: row.createdAt.toISOString(),
  };
}
