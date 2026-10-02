import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import { EntitlementsService } from "../plan/entitlements.service";
import { MAIL_SWEEP_JOB, MAIL_SWEEP_QUEUE } from "./mail.constants";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

@Injectable()
export class MailSweepWorker implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(MailSweepWorker.name);
  private connection?: Redis;
  private queue?: Queue;
  private worker?: Worker;
  private workerConnection?: Redis;

  constructor(
    private readonly config: ConfigService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async onModuleInit() {
    const url = this.config.get<string>("REDIS_URL")?.trim() || "redis://localhost:6381";
    this.connection = new Redis(url, { maxRetriesPerRequest: null });
    this.workerConnection = this.connection.duplicate();
    this.queue = new Queue(MAIL_SWEEP_QUEUE, { connection: this.connection });
    this.worker = new Worker(MAIL_SWEEP_QUEUE, () => this.entitlements.sweepTrialMail(), {
      connection: this.workerConnection,
    });
    this.worker.on("failed", (_job, err) => {
      this.log.warn(`trial mail sweep failed: ${err.message}`);
    });

    try {
      await this.connection.ping();
      await this.queue.upsertJobScheduler(MAIL_SWEEP_JOB, { every: SIX_HOURS_MS }, {
        name: MAIL_SWEEP_JOB,
        data: {},
      });
      this.log.log(`trial mail sweep every 6h`);
      await this.entitlements.sweepTrialMail();
    } catch (err) {
      const message = err instanceof Error ? err.message : "redis failed";
      this.log.warn(`trial mail sweep idle: ${message}`);
    }
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
    await this.workerConnection?.quit();
    await this.connection?.quit();
  }
}
