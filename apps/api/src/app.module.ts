import { Module, OnModuleInit } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule, seconds } from "@nestjs/throttler";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { AuthModule } from "./auth/auth.module";
import { StorageModule } from "./storage/storage.module";
import { SocialModule } from "./social/social.module";
import { ComposeModule } from "./compose/compose.module";
import { PostsModule } from "./posts/posts.module";
import { MediaModule } from "./media/media.module";
import { QueueModule } from "./queue/queue.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { WaitlistModule } from "./waitlist/waitlist.module";
import { PlanModule } from "./plan/plan.module";
import { BillingModule } from "./billing/billing.module";
import { MailModule } from "./mail/mail.module";
import { HealthController } from "./health.controller";
import { assertAppSecrets } from "./config/secrets";
import { assertRedisUrl } from "./config/redis-url";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env"],
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: "default", ttl: seconds(60), limit: 120 }],
    }),
    PrismaModule,
    RedisModule,
    MailModule,
    PlanModule,
    BillingModule,
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
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    assertAppSecrets({
      JWT_SECRET: this.config.get<string>("JWT_SECRET") ?? "",
      TOKEN_ENCRYPTION_KEY: this.config.get<string>("TOKEN_ENCRYPTION_KEY") ?? "",
    });
    assertRedisUrl(this.config.get<string>("REDIS_URL") ?? "");
  }
}
