import { Controller, Get } from "@nestjs/common";
import { PublishQueue } from "./queue/publish.queue";

@Controller()
export class HealthController {
  constructor(private readonly publishQueue: PublishQueue) {}

  @Get("health")
  async health() {
    const redis = await this.publishQueue.ping();
    return { ok: redis, product: "postN", redis, queue: "publish-post" };
  }
}
