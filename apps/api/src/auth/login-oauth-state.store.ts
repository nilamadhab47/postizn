import { Injectable } from "@nestjs/common";
import { randomBytes } from "node:crypto";

export type LoginOauthProvider = "google" | "linkedin" | "twitter";

type PendingLoginOauth = {
  provider: LoginOauthProvider;
  codeVerifier: string;
  expiresAt: number;
};

const TTL_MS = 10 * 60 * 1000;

@Injectable()
export class LoginOauthStateStore {
  private readonly pending = new Map<string, PendingLoginOauth>();

  create(provider: LoginOauthProvider, codeVerifier: string) {
    this.sweep();
    const state = randomBytes(24).toString("base64url");
    this.pending.set(state, {
      provider,
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
