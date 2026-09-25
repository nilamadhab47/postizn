import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ListBucketsCommand,
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

  async onModuleInit() {
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

    if (!endpoint) {
      this.log.warn(
        "R2 folder was not created. Add R2_ACCOUNT_ID (Cloudflare account id) or R2_ENDPOINT, then restart the API.",
      );
      return;
    }

    this.client = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });

    if (!this.bucket) {
      const listed = await this.client.send(new ListBucketsCommand({}));
      this.bucket = listed.Buckets?.[0]?.Name ?? "";
    }

    if (!this.bucket) {
      this.log.warn("R2_BUCKET is empty and no buckets were listed");
      return;
    }

    await this.ensureFolder();
  }

  objectKey(name: string) {
    return `${this.prefix}/${name.replace(/^\/+/, "")}`;
  }

  publicObjectUrl(key: string) {
    return this.publicUrl ? `${this.publicUrl}/${key}` : key;
  }

  async ensureFolder() {
    if (!this.client || !this.bucket) return;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: `${this.prefix}/.keep`,
        Body: Buffer.from(""),
        ContentType: "text/plain",
      }),
    );

    this.log.log(`R2 folder ready at ${this.prefix}/`);
  }

  async putObject(name: string, body: Buffer, contentType: string) {
    if (!this.client || !this.bucket) {
      throw new Error("R2 is not configured");
    }

    const key = this.objectKey(name);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );

    return { key, url: this.publicObjectUrl(key) };
  }
}
