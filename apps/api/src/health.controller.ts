import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { PublishQueue } from "./queue/publish.queue";

@Controller()
@SkipThrottle({ default: true })
export class HealthController {
  constructor(private readonly publishQueue: PublishQueue) {}

  @Get("health")
  async health() {
    const redis = await this.publishQueue.ping();
    return { ok: redis };
  }
}
