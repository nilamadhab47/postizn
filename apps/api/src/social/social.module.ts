import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SocialController } from "./social.controller";
import { SocialService } from "./social.service";
import { OauthStateStore } from "./oauth-state.store";
import { ProviderRegistry } from "./providers/provider.registry";
import { LinkedinProvider } from "./providers/linkedin.provider";
import { LinkedinPageProvider } from "./providers/linkedin-page.provider";
import { TwitterProvider } from "./providers/twitter.provider";
import { TelegramProvider } from "./providers/telegram.provider";
import { DevtoProvider } from "./providers/devto.provider";
import { SlackProvider } from "./providers/slack.provider";
import { DiscordProvider } from "./providers/discord.provider";

@Module({
  imports: [AuthModule],
  controllers: [SocialController],
  providers: [
    SocialService,
    OauthStateStore,
    ProviderRegistry,
    LinkedinProvider,
    LinkedinPageProvider,
    TwitterProvider,
    TelegramProvider,
    DevtoProvider,
    SlackProvider,
    DiscordProvider,
  ],
  exports: [SocialService, ProviderRegistry],
})
export class SocialModule {}
