import { Injectable } from "@nestjs/common";
import { Platform } from "@prisma/client";
import type { AuthResult } from "./base-provider";
import { TokenProvider, field, readJson } from "./token-provider";

@Injectable()
export class MediumProvider extends TokenProvider {
  readonly platform = Platform.MEDIUM;
  readonly slug = "medium";
  readonly label = "Medium";
  readonly blurb = "Self-issued integration token from Medium settings.";
  readonly tokenFields = [
    {
      name: "token",
      label: "Integration token",
      placeholder: "Medium token",
      hint: "medium.com/me/settings → Integration tokens",
      secret: true,
    },
  ];

  async authenticateToken(fields: Record<string, string>): Promise<AuthResult> {
    const token = field(fields, "token");
    if (!token) throw new Error("Medium token is required");

    const res = await fetch("https://api.medium.com/v1/me", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const json = (await readJson(res)) as {
      errors?: Array<{ message?: string }>;
      data?: {
        id?: string;
        username?: string;
        name?: string;
        imageUrl?: string;
      };
    };
    if (!res.ok || !json.data?.id) {
      throw new Error(json.errors?.[0]?.message ?? "Medium token was rejected");
    }

    return {
      platformId: json.data.id,
      username: json.data.username ?? json.data.id,
      displayName: json.data.name ?? json.data.username ?? "Medium",
      avatar: json.data.imageUrl,
      accessToken: token,
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
    const res = await fetch(
      `https://api.medium.com/v1/users/${input.platformId}/posts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          title,
          contentFormat: "markdown",
          content: input.content,
          publishStatus: "draft",
        }),
      },
    );
    const json = (await readJson(res)) as {
      errors?: Array<{ message?: string }>;
      data?: { id?: string };
    };
    if (!res.ok || !json.data?.id) {
      throw new Error(json.errors?.[0]?.message ?? "Medium publish failed");
    }
    return { platformPostId: json.data.id };
  }
}
