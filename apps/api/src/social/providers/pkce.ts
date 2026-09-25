import { createHash, randomBytes } from "node:crypto";

export function newCodeVerifier() {
  return randomBytes(32).toString("base64url");
}

export function challenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function hasKey(value: string) {
  return Boolean(value) && !value.startsWith("your_");
}

export function expiryFromSeconds(seconds?: number) {
  if (!seconds) return undefined;
  return new Date(Date.now() + seconds * 1000);
}
