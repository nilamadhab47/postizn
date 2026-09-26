import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

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
    if (!row) throw new NotFoundException("Image not found");
    await this.storage.deleteObject(row.key);
    await this.prisma.media.delete({ where: { id: row.id } });
    return { ok: true };
  }

  async urlsForUser(userId: string, urls: string[]) {
    if (!urls.length) return [];
    const rows = await this.prisma.media.findMany({
      where: { userId, url: { in: urls } },
      select: { url: true },
    });
    const allowed = new Set(rows.map((row) => row.url));
    return urls.filter((url) => allowed.has(url));
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
    if (!ALLOWED.has(mimeType)) {
      throw new BadRequestException("Use JPEG, PNG, WebP, or GIF");
    }
    if (bytes > MAX_BYTES) {
      throw new BadRequestException("Image must be under 8 MB");
    }
    const ext = EXT[mimeType] ?? "bin";
    const safe = originalName.replace(/[^\w.-]+/g, "_").slice(0, 80) || `image.${ext}`;
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
