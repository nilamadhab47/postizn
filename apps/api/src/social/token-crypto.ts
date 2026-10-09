import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

export const ENC_PREFIX = "enc:v1";

export function keyFromSecret(secret: string) {
  return createHash("sha256").update(secret).digest();
}

export function isEncryptedSecret(value: string) {
  return value.startsWith(`${ENC_PREFIX}:`);
}

export function encryptSecret(plain: string, key: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}:${iv.toString("base64url")}:${tag.toString("base64url")}:${data.toString("base64url")}`;
}

export function decryptSecret(
  value: string,
  key: Buffer,
  opts: { allowPlaintext?: boolean } = {},
) {
  if (!isEncryptedSecret(value)) {
    if (opts.allowPlaintext === false) {
      throw new Error("Refusing to use a plaintext secret");
    }
    return value;
  }

  const parts = value.split(":");
  const iv = Buffer.from(parts[2] ?? "", "base64url");
  const tag = Buffer.from(parts[3] ?? "", "base64url");
  const data = Buffer.from(parts[4] ?? "", "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}

export function decryptSecretWithKeys(
  value: string,
  keys: Buffer[],
  opts: { allowPlaintext?: boolean } = {},
) {
  if (!keys.length) {
    throw new Error("No decryption keys");
  }
  if (!isEncryptedSecret(value)) {
    if (opts.allowPlaintext === false) {
      throw new Error("Refusing to use a plaintext secret");
    }
    return { plain: value, rotated: true };
  }

  let lastError: unknown;
  for (let i = 0; i < keys.length; i++) {
    try {
      return { plain: decryptSecret(value, keys[i], opts), rotated: i > 0 };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Could not decrypt secret");
}
