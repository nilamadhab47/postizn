import { Injectable } from "@nestjs/common";
import { Platform } from "@prisma/client";
import type { AuthResult } from "./base-provider";
import { TokenProvider, field, readJson } from "./token-provider";

@Injectable()
export class DevtoProvider extends TokenProvider {
  readonly platform = Platform.DEVTO;
  readonly slug = "devto";
  readonly label = "Dev.to";
  readonly blurb = "API key from Dev.to → Settings → Extensions.";
  readonly tokenFields = [
    {
      name: "apiKey",
      label: "API key",
      placeholder: "dev.to api key",
      hint: "dev.to/settings/extensions",
      secret: true,
    },
  ];

  async authenticateToken(fields: Record<string, string>): Promise<AuthResult> {
    const apiKey = field(fields, "apiKey");
    if (!apiKey) throw new Error("Dev.to API key is required");

    const res = await fetch("https://dev.to/api/users/me", {
      headers: { "api-key": apiKey, Accept: "application/json" },
    });
    const json = (await readJson(res)) as {
      error?: string;
      id?: number;
      username?: string;
      name?: string;
      profile_image?: string;
    };
    if (!res.ok || json.id == null) {
      throw new Error(json.error ?? "Dev.to API key was rejected");
    }

    return {
      platformId: String(json.id),
      username: json.username ?? String(json.id),
      displayName: json.name ?? json.username ?? "Dev.to",
      avatar: json.profile_image,
      accessToken: apiKey,
    };
  }

  async publishPost(input: {
    content: string;
    mediaUrls: string[];
    accessToken: string;
    platformId: string;
  }) {
    const title =
      input.content.split("\n").find((line) => line.trim())?.slice(0, 80) ||
      "postN note";

    const imageMarkdown = (input.mediaUrls ?? [])
      .filter(Boolean)
      .map((url) => `\n\n![image](${url})`)
      .join("");
    const bodyMarkdown = input.content + imageMarkdown;
    const coverImage = input.mediaUrls?.[0] || undefined;

    const res = await fetch("https://dev.to/api/articles", {
      method: "POST",
      headers: {
        "api-key": input.accessToken,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        article: {
          title,
          body_markdown: bodyMarkdown,
          published: false,
          ...(coverImage ? { main_image: coverImage } : {}),
        },
      }),
    });
    const json = (await readJson(res)) as {
      error?: string;
      id?: number;
    };
    if (!res.ok || json.id == null) {
      throw new Error(json.error ?? "Dev.to publish failed");
    }
    return { platformPostId: String(json.id) };
  }
}
