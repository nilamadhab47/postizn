import { Injectable } from "@nestjs/common";
import { Platform } from "@prisma/client";
import type { AuthResult } from "./base-provider";
import { TokenProvider, field, readJson } from "./token-provider";

@Injectable()
export class SlackProvider extends TokenProvider {
  readonly platform = Platform.SLACK;
  readonly slug = "slack";
  readonly label = "Slack";
  readonly blurb = "Bot token with chat:write. Channel ID like C0…";
  readonly tokenFields = [
    {
      name: "botToken",
      label: "Bot token",
      placeholder: "xoxb-…",
      hint: "Slack app → OAuth → Bot User OAuth Token",
      secret: true,
    },
    {
      name: "channelId",
      label: "Channel ID",
      placeholder: "C0…",
      hint: "Channel details → copy ID. Invite the bot first.",
    },
  ];

  async authenticateToken(fields: Record<string, string>): Promise<AuthResult> {
    const botToken = field(fields, "botToken");
    const channelId = field(fields, "channelId");
    if (!botToken || !channelId) {
      throw new Error("Bot token and channel ID are required");
    }

    const res = await fetch("https://slack.com/api/auth.test", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${botToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    const json = (await readJson(res)) as {
      ok?: boolean;
      error?: string;
      user?: string;
      team?: string;
    };
    if (!res.ok || !json.ok) {
      throw new Error(json.error ?? "Slack bot token was rejected");
    }

    return {
      platformId: channelId,
      username: json.user ?? "slack",
      displayName: json.team ?? "Slack",
      accessToken: botToken,
    };
  }

  async publishPost(input: {
    content: string;
    mediaUrls: string[];
    accessToken: string;
    platformId: string;
  }) {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: input.platformId,
        text: input.content.slice(0, 40000),
      }),
    });
    const json = (await readJson(res)) as {
      ok?: boolean;
      error?: string;
      ts?: string;
    };
    if (!res.ok || !json.ok || !json.ts) {
      throw new Error(json.error ?? "Slack publish failed");
    }
    return { platformPostId: json.ts };
  }
}
