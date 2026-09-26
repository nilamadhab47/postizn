import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { StorageModule } from "./storage/storage.module";
import { SocialModule } from "./social/social.module";
import { ComposeModule } from "./compose/compose.module";
import { PostsModule } from "./posts/posts.module";
import { MediaModule } from "./media/media.module";
import { QueueModule } from "./queue/queue.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { WaitlistModule } from "./waitlist/waitlist.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env"],
    }),
    PrismaModule,
    AuthModule,
    StorageModule,
    SocialModule,
    ComposeModule,
    QueueModule,
    PostsModule,
    MediaModule,
    NotificationsModule,
    WaitlistModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

