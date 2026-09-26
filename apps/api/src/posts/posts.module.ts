import { Module, forwardRef } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SocialModule } from "../social/social.module";
import { PostsController } from "./posts.controller";
import { PostsService } from "./posts.service";
import { MediaModule } from "../media/media.module";
import { QueueModule } from "../queue/queue.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    AuthModule,
    SocialModule,
    MediaModule,
    NotificationsModule,
    forwardRef(() => QueueModule),
  ],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
