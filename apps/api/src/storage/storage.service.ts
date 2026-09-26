import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly log = new Logger(StorageService.name);
  private client: S3Client | null = null;
  private bucket = "";
  private prefix = "postn";
  private publicUrl = "";

  constructor(private readonly config: ConfigService) {}

  isConfigured() {
    return Boolean(this.client && this.bucket);
  }

  onModuleInit() {
    const accessKeyId = this.config.get<string>("R2_ACCESS_KEY_ID")?.trim();
    const secretAccessKey = this.config.get<string>("R2_SECRET_ACCESS_KEY")?.trim();
    const accountId = this.config.get<string>("R2_ACCOUNT_ID")?.trim();
    const endpoint =
      this.config.get<string>("R2_ENDPOINT")?.trim() ||
      (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");
    this.bucket = this.config.get<string>("R2_BUCKET")?.trim() ?? "";
    this.prefix = (this.config.get<string>("R2_PREFIX")?.trim() || "postn").replace(
      /\/+$/,
      "",
    );
    this.publicUrl = (this.config.get<string>("R2_PUBLIC_URL")?.trim() || "").replace(
      /\/+$/,
      "",
    );

    if (!accessKeyId || !secretAccessKey) {
      this.log.warn("R2 keys are missing");
      return;
    }

    if (!endpoint || !this.bucket) {
      this.log.warn(
        "R2 needs R2_BUCKET plus R2_ACCOUNT_ID or R2_ENDPOINT. Copy Account ID from the R2 dashboard sidebar.",
      );
      return;
    }

    this.client = new S3Client({
      region: "auto",
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });

    this.log.log(`R2 client ready for bucket ${this.bucket} (${this.prefix}/)`);
  }

  objectKey(name: string) {
    return `${this.prefix}/${name.replace(/^\/+/, "")}`;
  }

  publicObjectUrl(key: string) {
    return this.publicUrl ? `${this.publicUrl}/${key}` : key;
  }

  async putObject(name: string, body: Buffer, contentType: string) {
    if (!this.client || !this.bucket) {
      throw new Error("R2 is not configured");
    }

    const key = this.objectKey(name);
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "R2 upload failed";
      this.log.error(`PutObject ${key}: ${message}`);
      throw new Error(
        `R2 upload failed (${message}). Confirm Account ID, bucket longhand, and that the r2.dev public URL is enabled.`,
      );
    }

    return { key, url: this.publicObjectUrl(key) };
  }

  async deleteObject(key: string) {
    if (!this.client || !this.bucket) return;
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
