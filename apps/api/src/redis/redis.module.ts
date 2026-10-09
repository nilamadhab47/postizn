import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { assertRedisUrl } from "../config/redis-url";

export const REDIS = "REDIS";

export type RedisClient = Redis;

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const raw =
          config.get<string>("REDIS_URL")?.trim() ||
          (process.env.NODE_ENV === "production" ? "" : "redis://localhost:6381");
        return new Redis(assertRedisUrl(raw), { maxRetriesPerRequest: null });
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
