import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import convertHeic from "heic-convert";
import {
  MAX_VIDEO_BYTES,
  guessMimeFromUrl,
  looksLikeHeic,
  maxBytesForKind,
  mediaKind,
  parseCropRecipe,
  type CropRecipe,
  type MediaRef,
} from "@postn/shared";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { EntitlementsService } from "../plan/entitlements.service";
import { bakeDerivedJpeg } from "./derive-image";

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
    private readonly entitlements: EntitlementsService,
  ) {}

  status() {
    return { configured: this.storage.isConfigured() };
  }

  async list(userId: string) {
    const items = await this.prisma.media.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { parent: { select: { id: true, url: true } } },
    });
    return { configured: this.storage.isConfigured(), items: items.map(present) };
  }

  async uploadFile(
    userId: string,
    file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
  ) {
    const prepared = await prepareUpload(file);
    return this.save(userId, prepared.buffer, prepared.mimeType, prepared.fileName, prepared.bytes);
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

  async loadOwned(userId: string, url: string) {
    const row = await this.prisma.media.findFirst({
      where: { userId, url },
      select: { key: true, mimeType: true },
    });
    if (!row) throw new NotFoundException("File not found");
    try {
      const body = await this.storage.getObject(row.key);
      return { body, mimeType: row.mimeType };
    } catch {
      throw new NotFoundException("File not found");
    }
  }

  async derive(userId: string, source: { id?: string; url?: string }, raw: unknown) {
    const recipe = parseCropRecipe(raw);
    if (!recipe) {
      throw new BadRequestException("That crop is not usable");
    }
    const original = await this.findOriginal(userId, source);
    if (mediaKind(original.mimeType) !== "image") {
      throw new BadRequestException("Crop still photos only");
    }
    let input: Buffer;
    try {
      input = await this.storage.getObject(original.key);
    } catch {
      throw new NotFoundException("File not found");
    }
    let baked: Buffer;
    try {
      baked = await bakeDerivedJpeg(input, recipe);
    } catch {
      throw new BadRequestException("Could not bake that crop");
    }
    return this.save(
      userId,
      baked,
      "image/jpeg",
      "crop.jpg",
      baked.length,
      { parentId: original.id, recipe },
    );
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
      select: {
        id: true,
        url: true,
        mimeType: true,
        bytes: true,
        parentId: true,
        parent: { select: { id: true, url: true } },
      },
    });
    const byUrl = new Map(rows.map((row) => [row.url, row]));
    return urls
      .filter((url) => byUrl.has(url))
      .map((url) => toRef(byUrl.get(url)!));
  }

  async hydrate(userId: string, urls: string[]): Promise<MediaRef[]> {
    if (!urls.length) return [];
    const rows = await this.prisma.media.findMany({
      where: { userId, url: { in: urls } },
      select: {
        id: true,
        url: true,
        mimeType: true,
        bytes: true,
        parentId: true,
        parent: { select: { id: true, url: true } },
      },
    });
    const byUrl = new Map(rows.map((row) => [row.url, row]));
    return urls.map((url) => {
      const row = byUrl.get(url);
      if (!row) {
        return { url, mimeType: guessMimeFromUrl(url), bytes: 0 };
      }
      return toRef(row);
    });
  }

  private async findOriginal(userId: string, source: { id?: string; url?: string }) {
    const id = source.id?.trim();
    const url = source.url?.trim();
    const row = id
      ? await this.prisma.media.findFirst({ where: { id, userId } })
      : url
        ? await this.prisma.media.findFirst({ where: { url, userId } })
        : null;
    if (!row) throw new NotFoundException("File not found");
    if (!row.parentId) return row;
    const parent = await this.prisma.media.findFirst({
      where: { id: row.parentId, userId },
    });
    return parent ?? row;
  }

  private async save(
    userId: string,
    body: Buffer,
    mimeType: string,
    originalName: string,
    bytes: number,
    extra?: { parentId?: string; recipe?: CropRecipe },
  ) {
    await this.entitlements.assertWritable(userId);
    if (!this.storage.isConfigured()) {
      throw new BadRequestException("R2 is not configured. Add account id, bucket, and keys, then restart the API.");
    }
    const kind = mediaKind(mimeType);
    if (!kind) {
      throw new BadRequestException("Use JPEG, PNG, WebP, HEIC, GIF, or MP4");
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
        parentId: extra?.parentId,
        recipe: extra?.recipe
          ? (extra.recipe as unknown as Prisma.InputJsonValue)
          : undefined,
      },
      include: { parent: { select: { id: true, url: true } } },
    });
    return present(row);
  }
}

async function prepareUpload(file: {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}) {
  if (!looksLikeHeic(file.mimetype, file.originalname, file.buffer)) {
    return {
      buffer: file.buffer,
      mimeType: file.mimetype,
      fileName: file.originalname,
      bytes: file.size || file.buffer.length,
    };
  }
  if (file.buffer.length > maxBytesForKind("image")) {
    throw new BadRequestException(sizeMessage("image", maxBytesForKind("image")));
  }
  try {
    const jpeg = Buffer.from(
      await convertHeic({
        buffer: file.buffer,
        format: "JPEG",
        quality: 0.92,
      }),
    );
    const base = file.originalname.replace(/\.hei[cf]$/i, "") || "iphone";
    return {
      buffer: jpeg,
      mimeType: "image/jpeg",
      fileName: `${base}.jpg`,
      bytes: jpeg.length,
    };
  } catch {
    throw new BadRequestException("Could not read that iPhone photo");
  }
}

function sizeMessage(kind: "image" | "gif" | "video", cap: number) {
  const mb = Math.round(cap / (1024 * 1024));
  if (kind === "video") return `Video must be under ${mb} MB`;
  if (kind === "gif") return `GIF must be under ${mb} MB`;
  return `Photo must be under ${mb} MB`;
}

function toRef(row: {
  id: string;
  url: string;
  mimeType: string;
  bytes: number;
  parentId: string | null;
  parent: { id: string; url: string } | null;
}): MediaRef {
  return {
    id: row.id,
    url: row.url,
    mimeType: row.mimeType,
    bytes: row.bytes,
    sourceId: row.parentId ?? undefined,
    sourceUrl: row.parent?.url ?? undefined,
  };
}

function present(row: {
  id: string;
  url: string;
  key: string;
  mimeType: string;
  fileName: string;
  bytes: number;
  createdAt: Date;
  parentId?: string | null;
  recipe?: Prisma.JsonValue | null;
  parent?: { id: string; url: string } | null;
}) {
  return {
    id: row.id,
    url: row.url,
    key: row.key,
    mimeType: row.mimeType,
    fileName: row.fileName,
    bytes: row.bytes,
    parentId: row.parentId ?? null,
    sourceId: row.parentId ?? null,
    sourceUrl: row.parent?.url ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
