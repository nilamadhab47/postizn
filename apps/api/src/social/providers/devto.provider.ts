import { Injectable } from "@nestjs/common";
import { Platform } from "@prisma/client";
import { mediaKind } from "@postn/shared";
import type { AuthResult, PublishInput } from "./base-provider";
import { TokenProvider, field, readJson } from "./token-provider";
import { itemsFromPublish } from "./fetch-media";

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

  async publishPost(input: PublishInput) {
    const items = itemsFromPublish(input);
    if (items.some((item) => mediaKind(item.mimeType) === "video")) {
      throw new Error("Dev.to does not take video. Unselect Dev.to or drop the video.");
    }
    const title =
      input.content.split("\n").find((line) => line.trim())?.slice(0, 80) ||
      "postN note";

    const imageMarkdown = items
      .filter((item) => item.url)
      .map((item) => `\n\n![image](${item.url})`)
      .join("");
    const bodyMarkdown = input.content + imageMarkdown;
    const coverImage = items[0]?.url || undefined;

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
