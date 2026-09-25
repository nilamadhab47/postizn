import { Injectable } from "@nestjs/common";
import { Platform } from "@prisma/client";
import type { BaseProvider } from "./base-provider";
import { LinkedinProvider } from "./linkedin.provider";
import { LinkedinPageProvider } from "./linkedin-page.provider";
import { TwitterProvider } from "./twitter.provider";
import { TelegramProvider } from "./telegram.provider";
import { DevtoProvider } from "./devto.provider";
import { SlackProvider } from "./slack.provider";
import { DiscordProvider } from "./discord.provider";

@Injectable()
export class ProviderRegistry {
  private readonly byPlatform: Map<Platform, BaseProvider>;
  private readonly bySlug: Map<string, BaseProvider>;

  constructor(
    linkedin: LinkedinProvider,
    linkedinPage: LinkedinPageProvider,
    twitter: TwitterProvider,
    telegram: TelegramProvider,
    devto: DevtoProvider,
    slack: SlackProvider,
    discord: DiscordProvider,
  ) {
    const providers = [
      linkedin,
      linkedinPage,
      twitter,
      telegram,
      slack,
      discord,
      devto,
    ];
    this.byPlatform = new Map(providers.map((p) => [p.platform, p]));
    this.bySlug = new Map(providers.map((p) => [p.slug, p]));
  }

  all() {
    return [...this.byPlatform.values()];
  }

  getByPlatform(platform: Platform) {
    return this.byPlatform.get(platform);
  }

  getBySlug(slug: string) {
    return this.bySlug.get(slug.toLowerCase());
  }
}
