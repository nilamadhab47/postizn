import { Injectable } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import type { Platform } from "@prisma/client";

type PendingOauth = {
  userId: string;
  platform: Platform;
  codeVerifier: string;
  expiresAt: number;
};

const TTL_MS = 10 * 60 * 1000;

@Injectable()
export class OauthStateStore {
  private readonly pending = new Map<string, PendingOauth>();

  create(userId: string, platform: Platform, codeVerifier: string) {
    this.sweep();
    const state = randomBytes(24).toString("base64url");
    this.pending.set(state, {
      userId,
      platform,
      codeVerifier,
      expiresAt: Date.now() + TTL_MS,
    });
    return state;
  }

  take(state: string) {
    const row = this.pending.get(state);
    this.pending.delete(state);
    if (!row || row.expiresAt < Date.now()) {
      return null;
    }
    return row;
  }

  private sweep() {
    const now = Date.now();
    for (const [key, row] of this.pending) {
      if (row.expiresAt < now) {
        this.pending.delete(key);
      }
    }
  }
}
