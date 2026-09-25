import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const PREFIX = "enc:v1";

export function keyFromSecret(secret: string) {
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plain: string, key: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}:${iv.toString("base64url")}:${tag.toString("base64url")}:${data.toString("base64url")}`;
}

export function decryptSecret(value: string, key: Buffer) {
  if (!value.startsWith(`${PREFIX}:`)) {
    return value;
  }

  const parts = value.split(":");
  const iv = Buffer.from(parts[2] ?? "", "base64url");
  const tag = Buffer.from(parts[3] ?? "", "base64url");
  const data = Buffer.from(parts[4] ?? "", "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
