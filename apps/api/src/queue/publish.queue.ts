import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PostStatus } from "@prisma/client";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { PrismaService } from "../prisma/prisma.service";
import {
  PUBLISH_JOB,
  PUBLISH_QUEUE,
  type PublishJobData,
} from "./queue.constants";

@Injectable()
export class PublishQueue implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(PublishQueue.name);
  readonly connection: Redis;
  readonly queue: Queue<PublishJobData>;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const url = config.get<string>("REDIS_URL")?.trim() || "redis://localhost:6381";
    this.connection = new Redis(url, { maxRetriesPerRequest: null });
    this.queue = new Queue<PublishJobData>(PUBLISH_QUEUE, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 20_000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 500 },
      },
    });
  }

  async onModuleInit() {
    try {
      await this.connection.ping();
      this.log.log(`Redis ready for ${PUBLISH_QUEUE}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "ping failed";
      this.log.error(`Redis is not reachable: ${message}`);
    }
  }

  workerConnection() {
    return this.connection.duplicate();
  }

  async ping() {
    try {
      return (await this.connection.ping()) === "PONG";
    } catch {
      return false;
    }
  }

  async enqueue(postId: string, scheduledAt: Date) {
    await this.remove(postId);
    const delay = Math.max(0, scheduledAt.getTime() - Date.now());
    const job = await this.queue.add(
      PUBLISH_JOB,
      { postId },
      { jobId: postId, delay },
    );
    await this.prisma.post.update({
      where: { id: postId },
      data: { jobId: String(job.id) },
    });
    this.log.log(`queued ${postId} delay=${delay}ms`);
    return String(job.id);
  }

  async remove(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { jobId: true },
    });
    const ids = new Set([postId, post?.jobId].filter(Boolean) as string[]);
    for (const id of ids) {
      const job = await this.queue.getJob(id);
      if (job) await job.remove();
    }
  }

  async recoverScheduled() {
    const rows = await this.prisma.post.findMany({
      where: { status: PostStatus.SCHEDULED, scheduledAt: { not: null } },
      select: { id: true, scheduledAt: true, jobId: true },
    });
    let recovered = 0;
    for (const row of rows) {
      if (!row.scheduledAt) continue;
      try {
        const existing = await this.queue.getJob(row.id);
        const state = existing ? await existing.getState() : "unknown";
        if (existing && (state === "delayed" || state === "waiting" || state === "active")) {
          if (row.jobId !== String(existing.id)) {
            await this.prisma.post.update({
              where: { id: row.id },
              data: { jobId: String(existing.id) },
            });
          }
          continue;
        }
        await this.enqueue(row.id, row.scheduledAt);
        recovered += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : "enqueue failed";
        this.log.warn(`could not recover ${row.id}: ${message}`);
      }
    }
    if (recovered) {
      this.log.log(`re-queued ${recovered} scheduled post(s)`);
    }
  }

  async onModuleDestroy() {
    await this.queue.close();
    await this.connection.quit();
  }
}
