import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { StorageModule } from "./storage/storage.module";
import { SocialModule } from "./social/social.module";
import { ComposeModule } from "./compose/compose.module";
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
  ],
  controllers: [HealthController],
})
export class AppModule {}

