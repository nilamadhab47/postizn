import { Inject, Injectable } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import type { Platform } from "@prisma/client";
import { REDIS, type RedisClient } from "../redis/redis.module";

export type PendingOauth = {
  userId: string;
  platform: Platform;
  codeVerifier: string;
};

const TTL_SEC = 10 * 60;
const PREFIX = "postn:oauth:social:";

@Injectable()
export class OauthStateStore {
  constructor(@Inject(REDIS) private readonly redis: RedisClient) {}

  async create(userId: string, platform: Platform, codeVerifier: string) {
    const state = randomBytes(24).toString("base64url");
    await this.redis.set(
      PREFIX + state,
      JSON.stringify({ userId, platform, codeVerifier }),
      "EX",
      TTL_SEC,
    );
    return state;
  }

  async take(state: string) {
    if (!state || state.length > 128) return null;
    const raw = await this.redis.getdel(PREFIX + state);
    return parseSocialOauth(raw);
  }
}

export function parseSocialOauth(raw: string | null): PendingOauth | null {
  if (!raw) return null;
  try {
    const row = JSON.parse(raw) as PendingOauth;
    if (!row?.userId || !row.platform || typeof row.codeVerifier !== "string") {
      return null;
    }
    return row;
  } catch {
    return null;
  }
}
