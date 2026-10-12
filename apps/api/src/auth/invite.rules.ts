import { randomBytes } from "node:crypto";

export function newInviteToken() {
  return randomBytes(24).toString("base64url");
}

export function isInviteToken(raw: string) {
  return /^[A-Za-z0-9_-]{20,64}$/.test(raw);
}
