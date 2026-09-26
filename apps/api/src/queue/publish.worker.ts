import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  forwardRef,
} from "@nestjs/common";
import { Worker, type Job } from "bullmq";
import type Redis from "ioredis";
import { PostsService } from "../posts/posts.service";
import { PublishQueue } from "./publish.queue";
import {
  PUBLISH_QUEUE,
  type PublishJobData,
} from "./queue.constants";

@Injectable()
export class PublishWorker implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(PublishWorker.name);
  private worker?: Worker<PublishJobData>;
  private workerConnection?: Redis;

  constructor(
    private readonly publishQueue: PublishQueue,
    @Inject(forwardRef(() => PostsService))
    private readonly posts: PostsService,
  ) {}

  async onModuleInit() {
    this.workerConnection = this.publishQueue.workerConnection();
    this.worker = new Worker<PublishJobData>(
      PUBLISH_QUEUE,
      (job) => this.handle(job),
      {
        connection: this.workerConnection,
        concurrency: 2,
        lockDuration: 120_000,
      },
    );
    this.worker.on("completed", (job) => {
      this.log.log(`done ${job.data.postId}`);
    });
    this.worker.on("failed", (job, err) => {
      this.log.warn(`failed ${job?.data.postId ?? job?.id}: ${err.message}`);
    });
    await this.publishQueue.recoverScheduled();
  }

  private async handle(job: Job<PublishJobData>) {
    if (!job.data?.postId) {
      this.log.warn(`job ${job.id} has no postId`);
      return;
    }
    this.log.log(`publishing ${job.data.postId}`);
    await this.posts.publishDue(job.data.postId);
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.workerConnection?.quit();
  }
}
