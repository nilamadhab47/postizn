import { Inject, Injectable } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { REDIS, type RedisClient } from "../redis/redis.module";

export type LoginOauthProvider = "google" | "linkedin" | "twitter";

export type PendingLoginOauth = {
  provider: LoginOauthProvider;
  codeVerifier: string;
};

const TTL_SEC = 10 * 60;
const PREFIX = "postn:oauth:login:";

@Injectable()
export class LoginOauthStateStore {
  constructor(@Inject(REDIS) private readonly redis: RedisClient) {}

  async create(provider: LoginOauthProvider, codeVerifier: string) {
    const state = randomBytes(24).toString("base64url");
    await this.redis.set(
      PREFIX + state,
      JSON.stringify({ provider, codeVerifier }),
      "EX",
      TTL_SEC,
    );
    return state;
  }

  async take(state: string) {
    if (!state || state.length > 128) return null;
    const raw = await this.redis.getdel(PREFIX + state);
    return parseLoginOauth(raw);
  }
}

export function parseLoginOauth(raw: string | null): PendingLoginOauth | null {
  if (!raw) return null;
  try {
    const row = JSON.parse(raw) as PendingLoginOauth;
    if (
      (row.provider !== "google" &&
        row.provider !== "linkedin" &&
        row.provider !== "twitter") ||
      typeof row.codeVerifier !== "string"
    ) {
      return null;
    }
    return row;
  } catch {
    return null;
  }
}
