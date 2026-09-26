import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Platform } from "@prisma/client";
import { BaseProvider, type AuthResult, type UploadInput } from "./base-provider";
import { challenge, expiryFromSeconds, hasKey } from "./pkce";

const AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.x.com/2/oauth2/token";
const ME_URL = "https://api.x.com/2/users/me?user.fields=profile_image_url,name,username";
const TWEET_URL = "https://api.x.com/2/tweets";
const MEDIA_UPLOAD_URL = "https://api.x.com/2/media/upload";
const SCOPES = [
  "tweet.read",
  "tweet.write",
  "users.read",
  "offline.access",
  "media.write",
];

@Injectable()
export class TwitterProvider extends BaseProvider {
  readonly platform = Platform.TWITTER;
  readonly slug = "twitter";
  readonly label = "X";
  readonly plan = "FREE" as const;
  readonly connectMode = "oauth" as const;
  readonly blurb = "Personal account. Free.";

  constructor(private readonly config: ConfigService) {
    super();
  }

  isConfigured() {
    return hasKey(this.clientId()) && hasKey(this.clientSecret());
  }

  createAuthUrl(input: {
    state: string;
    codeVerifier: string;
    redirectUri: string;
  }) {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId(),
      redirect_uri: input.redirectUri,
      scope: SCOPES.join(" "),
      state: input.state,
      code_challenge: challenge(input.codeVerifier),
      code_challenge_method: "S256",
    });
    return `${AUTH_URL}?${params.toString()}`;
  }

  async authenticate(input: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }) {
    const tokens = await this.exchange({
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: input.redirectUri,
      code_verifier: input.codeVerifier,
      client_id: this.clientId(),
    });
    return this.profileFromAccessToken(tokens);
  }

  async refreshToken(refreshToken: string) {
    const tokens = await this.exchange({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: this.clientId(),
    });
    return this.profileFromAccessToken(tokens);
  }

  async uploadMedia(_input: UploadInput): Promise<{ id: string }> {
    throw new Error("X media upload is not wired yet");
  }

  async publishPost(input: {
    content: string;
    mediaUrls: string[];
    accessToken: string;
    platformId: string;
  }) {
    let mediaPayload: Record<string, unknown> = {};

    const imageUrl = input.mediaUrls[0];
    if (imageUrl) {
      const mediaId = await this.uploadImageForTweet(input.accessToken, imageUrl);
      if (mediaId) {
        mediaPayload = { media: { media_ids: [mediaId] } };
      }
    }

    const res = await fetch(TWEET_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: input.content, ...mediaPayload }),
    });
    const json = (await res.json()) as XProblem & { data?: { id?: string } };
    if (!res.ok || !json.data?.id) {
      throw new Error(xProblem(json, `X publish failed (${res.status})`));
    }
    return { platformPostId: json.data.id };
  }

  private async uploadImageForTweet(
    accessToken: string,
    imageUrl: string,
  ): Promise<string | null> {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      throw new Error(`Could not fetch image from ${imageUrl}`);
    }
    const imgBuf = Buffer.from(await imgRes.arrayBuffer());
    const contentType = (imgRes.headers.get("content-type") ?? "image/jpeg")
      .split(";")[0]
      .trim()
      .toLowerCase();
    const mediaCategory = categoryFor(contentType);

    const initRes = await fetch(`${MEDIA_UPLOAD_URL}/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        media_type: contentType,
        total_bytes: imgBuf.length,
        media_category: mediaCategory,
      }),
    });
    const initJson = (await initRes.json()) as XProblem & {
      data?: { id?: string };
    };
    if (!initRes.ok || !initJson.data?.id) {
      throw new Error(
        xProblem(initJson, `X media init failed (${initRes.status})`),
      );
    }
    const mediaId = String(initJson.data.id);

    const chunkSize = 1024 * 1024;
    for (let i = 0; i < imgBuf.length; i += chunkSize) {
      const chunk = imgBuf.subarray(i, i + chunkSize);
      const form = new FormData();
      form.set("segment_index", String(Math.floor(i / chunkSize)));
      form.set(
        "media",
        new Blob([chunk], { type: "application/octet-stream" }),
        "chunk",
      );

      const appendRes = await fetch(`${MEDIA_UPLOAD_URL}/${mediaId}/append`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      });
      if (!appendRes.ok) {
        const appendJson = (await appendRes.json().catch(() => null)) as XProblem | null;
        throw new Error(
          xProblem(appendJson, `X media append failed (${appendRes.status})`),
        );
      }
    }

    const finRes = await fetch(`${MEDIA_UPLOAD_URL}/${mediaId}/finalize`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const finJson = (await finRes.json().catch(() => null)) as
      | (XProblem & { data?: { processing_info?: XProcessing } })
      | null;
    if (!finRes.ok) {
      throw new Error(
        xProblem(finJson, `X media finalize failed (${finRes.status})`),
      );
    }

    await this.waitForMedia(accessToken, mediaId, finJson?.data?.processing_info);
    return mediaId;
  }

  private async waitForMedia(
    accessToken: string,
    mediaId: string,
    initial?: XProcessing,
  ) {
    let info = initial;
    for (let i = 0; i < 20; i++) {
      if (!info || info.state === "succeeded") return;
      if (info.state === "failed") {
        throw new Error(info.error?.message ?? "X rejected this media");
      }
      const waitMs = Math.max(1, info.check_after_secs ?? 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      const statusRes = await fetch(
        `${MEDIA_UPLOAD_URL}?command=STATUS&media_id=${encodeURIComponent(mediaId)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const statusJson = (await statusRes.json()) as XProblem & {
        data?: { processing_info?: XProcessing };
        processing_info?: XProcessing;
      };
      if (!statusRes.ok) {
        throw new Error(
          xProblem(statusJson, `X media status failed (${statusRes.status})`),
        );
      }
      info =
        statusJson.data?.processing_info ?? statusJson.processing_info ?? {
          state: "succeeded",
        };
    }
    throw new Error("X is still processing this media");
  }

  private clientId() {
    return this.config.get<string>("TWITTER_CLIENT_ID")?.trim() ?? "";
  }

  private clientSecret() {
    return this.config.get<string>("TWITTER_CLIENT_SECRET")?.trim() ?? "";
  }

  private basicAuth() {
    return Buffer.from(`${this.clientId()}:${this.clientSecret()}`).toString(
      "base64",
    );
  }

  private async exchange(body: Record<string, string>) {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.basicAuth()}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body),
    });
    const json = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error_description?: string;
    };
    if (!res.ok || !json.access_token) {
      throw new Error(json.error_description ?? "X token exchange failed");
    }
    return {
      access_token: json.access_token,
      refresh_token: json.refresh_token,
      expires_in: json.expires_in,
    };
  }

  private async profileFromAccessToken(tokens: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  }): Promise<AuthResult> {
    const res = await fetch(ME_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const json = (await res.json()) as {
      data?: {
        id: string;
        name?: string;
        username?: string;
        profile_image_url?: string;
      };
    };
    if (!res.ok || !json.data?.id) {
      throw new Error("X profile lookup failed");
    }

    return {
      platformId: json.data.id,
      username: json.data.username ?? json.data.id,
      displayName: json.data.name ?? json.data.username ?? "X",
      avatar: json.data.profile_image_url,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry: expiryFromSeconds(tokens.expires_in),
    };
  }
}

type XProcessing = {
  state?: string;
  check_after_secs?: number;
  error?: { message?: string };
};

type XProblem = {
  title?: string;
  detail?: string;
  errors?: Array<{ message?: string; detail?: string }>;
} | null;

function categoryFor(mime: string) {
  if (mime === "image/gif") return "tweet_gif";
  if (mime.startsWith("video/")) return "tweet_video";
  return "tweet_image";
}

function xProblem(json: XProblem, fallback: string) {
  if (!json) return fallback;
  const nested = (json.errors ?? [])
    .map((row) => row.message || row.detail)
    .filter(Boolean)
    .join("; ");
  return [json.detail, nested, json.title].filter(Boolean)[0] ?? fallback;
}
