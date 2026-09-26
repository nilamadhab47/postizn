import { Module, forwardRef } from "@nestjs/common";
import { PostsModule } from "../posts/posts.module";
import { PublishQueue } from "./publish.queue";
import { PublishWorker } from "./publish.worker";

@Module({
  imports: [forwardRef(() => PostsModule)],
  providers: [PublishQueue, PublishWorker],
  exports: [PublishQueue],
})
export class QueueModule {}
