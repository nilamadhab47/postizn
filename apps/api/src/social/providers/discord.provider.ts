import { Injectable } from "@nestjs/common";
import { Platform } from "@prisma/client";
import type { AuthResult } from "./base-provider";
import { TokenProvider, field, readJson } from "./token-provider";

@Injectable()
export class DiscordProvider extends TokenProvider {
  readonly platform = Platform.DISCORD;
  readonly slug = "discord";
  readonly label = "Discord";
  readonly blurb = "Channel webhook URL. Posts as that webhook.";
  readonly tokenFields = [
    {
      name: "webhookUrl",
      label: "Webhook URL",
      placeholder: "https://discord.com/api/webhooks/…",
      hint: "Channel → Integrations → Webhooks → Copy URL",
      secret: true,
    },
  ];

  async authenticateToken(fields: Record<string, string>): Promise<AuthResult> {
    const webhookUrl = field(fields, "webhookUrl");
    if (!webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
      throw new Error("Paste a discord.com webhook URL");
    }

    const res = await fetch(webhookUrl);
    const json = (await readJson(res)) as {
      message?: string;
      id?: string;
      name?: string;
      channel_id?: string;
    };
    if (!res.ok || !json.id) {
      throw new Error(json.message ?? "Discord webhook was rejected");
    }

    return {
      platformId: json.channel_id ?? json.id,
      username: json.name ?? "discord",
      displayName: json.name ?? "Discord",
      accessToken: webhookUrl,
    };
  }

  async publishPost(input: {
    content: string;
    mediaUrls: string[];
    accessToken: string;
    platformId: string;
  }) {
    const embeds = (input.mediaUrls ?? [])
      .filter(Boolean)
      .map((url) => ({ image: { url } }));

    const res = await fetch(input.accessToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: input.content.slice(0, 2000),
        username: "postN",
        ...(embeds.length ? { embeds } : {}),
      }),
    });
    if (res.status !== 204 && !res.ok) {
      const json = await readJson(res);
      throw new Error(
        typeof json.message === "string" ? json.message : "Discord publish failed",
      );
    }
    return { platformPostId: `discord-${input.platformId}-${Date.now()}` };
  }
}
