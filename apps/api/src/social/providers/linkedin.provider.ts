import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Platform } from "@prisma/client";
import { mediaKind, cleanAltText } from "@postn/shared";
import { BaseProvider, type AuthResult, type PublishInput, type UploadInput } from "./base-provider";
import type { ChannelPlan } from "../channel-catalog";
import { expiryFromSeconds, hasKey } from "./pkce";
import { StorageService } from "../../storage/storage.service";
import { fetchRemoteFile, firstKind, itemsFromPublish } from "./fetch-media";
import { linkedInCommentBody, linkedInCommentUrl } from "./linkedin-comment";

const AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
const POSTS_URL = "https://api.linkedin.com/rest/posts";
const IMAGES_URL = "https://api.linkedin.com/rest/images?action=initializeUpload";
const VIDEOS_URL = "https://api.linkedin.com/rest/videos";
const MEMBER_SCOPES = ["openid", "profile", "email", "w_member_social"];
export const LINKEDIN_VERSION = "202609";

export type LinkedInTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  id_token?: string;
};

@Injectable()
export class LinkedinProvider extends BaseProvider {
  readonly platform: Platform = Platform.LINKEDIN;
  readonly slug: string = "linkedin";
  readonly label: string = "LinkedIn";
  readonly plan: ChannelPlan = "FREE";
  readonly connectMode = "oauth" as const;
  readonly blurb: string = "Personal profile. Free.";

  constructor(
    protected readonly config: ConfigService,
    protected readonly storage: StorageService,
  ) {
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
      state: input.state,
      scope: this.authScopes().join(" "),
    });
    return `${AUTH_URL}?${params.toString().replace(/\+/g, "%20")}`;
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
      client_id: this.clientId(),
      client_secret: this.clientSecret(),
    });
    return this.accountFromTokens(tokens);
  }

  async refreshToken(refreshToken: string) {
    const tokens = await this.exchange({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: this.clientId(),
      client_secret: this.clientSecret(),
    });
    return this.accountFromTokens(tokens);
  }

  async uploadMedia(_input: UploadInput): Promise<{ id: string }> {
    throw new Error("LinkedIn media upload is not wired yet");
  }

  async publishPost(input: PublishInput) {
    let mediaContent: Record<string, unknown> = {};
    const items = itemsFromPublish(input);
    const kind = firstKind(items);

    if (kind === "video" && items[0]) {
      const videoUrn = await this.uploadVideo(
        input.accessToken,
        input.platformId,
        items[0].url,
      );
      mediaContent = { content: { media: mediaRef(videoUrn, items[0].alt) } };
    } else if (items.length >= 2) {
      const images: Array<{ id: string; altText?: string }> = [];
      for (const item of items) {
        if (mediaKind(item.mimeType) !== "image" && mediaKind(item.mimeType) !== "gif") {
          continue;
        }
        const urn = await this.uploadImage(
          input.accessToken,
          input.platformId,
          item.url,
        );
        if (urn) images.push(mediaRef(urn, item.alt));
      }
      if (images.length === 1) {
        mediaContent = { content: { media: images[0] } };
      } else if (images.length > 1) {
        mediaContent = {
          content: {
            multiImage: {
              images,
            },
          },
        };
      }
    } else if (items[0]) {
      const imageUrn = await this.uploadImage(
        input.accessToken,
        input.platformId,
        items[0].url,
      );
      if (imageUrn) {
        mediaContent = { content: { media: mediaRef(imageUrn, items[0].alt) } };
      }
    }

    const res = await fetch(POSTS_URL, {
      method: "POST",
      headers: this.restHeaders(input.accessToken),
      body: JSON.stringify({
        author: this.authorUrn(input.platformId),
        commentary: escapeLinkedInText(input.content),
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
        ...mediaContent,
      }),
    });

    if (!res.ok) {
      const raw = await res.text();
      let detail = raw.slice(0, 220);
      try {
        const json = JSON.parse(raw) as { message?: string; errorDetail?: string };
        detail = json.message || json.errorDetail || detail;
      } catch {
        /* keep raw */
      }
      throw new Error(`LinkedIn publish failed (${res.status}): ${detail}`);
    }

    const postId = res.headers.get("x-restli-id") ?? `linkedin-${Date.now()}`;
    return { platformPostId: postId };
  }

  override async commentOnPost(input: {
    accessToken: string;
    platformId: string;
    platformPostId: string;
    text: string;
  }) {
    const text = input.text.trim();
    if (!text) return null;
    const actor = this.authorUrn(input.platformId);
    const res = await fetch(linkedInCommentUrl(input.platformPostId), {
      method: "POST",
      headers: this.restHeaders(input.accessToken),
      body: JSON.stringify(
        linkedInCommentBody(actor, input.platformPostId, text),
      ),
    });
    if (!res.ok) {
      const raw = await res.text();
      let detail = raw.slice(0, 220);
      try {
        const json = JSON.parse(raw) as { message?: string; errorDetail?: string };
        detail = json.message || json.errorDetail || detail;
      } catch {
        /* keep raw */
      }
      throw new Error(`LinkedIn comment failed (${res.status}): ${detail}`);
    }
    const fromHeader = res.headers.get("x-restli-id")?.trim();
    if (fromHeader) return { commentId: fromHeader };
    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      object?: string;
    };
    return { commentId: json.id || json.object || "ok" };
  }

  private async uploadImage(
    accessToken: string,
    platformId: string,
    imageUrl: string,
  ): Promise<string | null> {
    const initRes = await fetch(IMAGES_URL, {
      method: "POST",
      headers: this.restHeaders(accessToken),
      body: JSON.stringify({
        initializeUploadRequest: {
          owner: this.authorUrn(platformId),
        },
      }),
    });
    if (!initRes.ok) {
      const msg = await initRes.text().catch(() => "");
      throw new Error(
        `LinkedIn image init failed (${initRes.status}): ${msg.slice(0, 200)}`,
      );
    }
    const initJson = (await initRes.json()) as {
      value?: { uploadUrl?: string; image?: string };
    };
    const uploadUrl = initJson.value?.uploadUrl;
    const imageUrn = initJson.value?.image;
    if (!uploadUrl || !imageUrn) {
      throw new Error("LinkedIn image init returned no upload URL");
    }

    const img = await fetchRemoteFile(imageUrl, this.storage);
    const contentType = img.mimeType || "application/octet-stream";

    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": contentType,
      },
      body: img.buffer,
    });
    if (!putRes.ok && putRes.status !== 201) {
      throw new Error(`LinkedIn image PUT failed (${putRes.status})`);
    }

    return imageUrn;
  }

  private async uploadVideo(
    accessToken: string,
    platformId: string,
    videoUrl: string,
  ) {
    const file = await fetchRemoteFile(videoUrl, this.storage);
    const initRes = await fetch(`${VIDEOS_URL}?action=initializeUpload`, {
      method: "POST",
      headers: this.restHeaders(accessToken),
      body: JSON.stringify({
        initializeUploadRequest: {
          owner: this.authorUrn(platformId),
          fileSizeBytes: file.buffer.length,
          uploadCaptions: false,
          uploadThumbnail: false,
        },
      }),
    });
    if (!initRes.ok) {
      const msg = await initRes.text().catch(() => "");
      throw new Error(
        `LinkedIn video init failed (${initRes.status}): ${msg.slice(0, 200)}`,
      );
    }
    const initJson = (await initRes.json()) as {
      value?: {
        video?: string;
        uploadToken?: string;
        uploadInstructions?: Array<{
          uploadUrl?: string;
          firstByte?: number;
          lastByte?: number;
        }>;
      };
    };
    const videoUrn = initJson.value?.video;
    const instructions = initJson.value?.uploadInstructions ?? [];
    if (!videoUrn || !instructions.length) {
      throw new Error("LinkedIn video init returned no upload URL");
    }

    const uploadedPartIds: string[] = [];
    for (const part of instructions) {
      if (!part.uploadUrl) {
        throw new Error("LinkedIn video part is missing an upload URL");
      }
      const start = part.firstByte ?? 0;
      const end = (part.lastByte ?? file.buffer.length - 1) + 1;
      const chunk = file.buffer.subarray(start, end);
      const putRes = await fetch(part.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: chunk,
      });
      if (!putRes.ok && putRes.status !== 201) {
        throw new Error(`LinkedIn video PUT failed (${putRes.status})`);
      }
      const etag = (putRes.headers.get("etag") ?? "").replace(/"/g, "");
      if (!etag) {
        throw new Error("LinkedIn video PUT returned no ETag");
      }
      uploadedPartIds.push(etag);
    }

    const finRes = await fetch(`${VIDEOS_URL}?action=finalizeUpload`, {
      method: "POST",
      headers: this.restHeaders(accessToken),
      body: JSON.stringify({
        finalizeUploadRequest: {
          video: videoUrn,
          uploadToken: initJson.value?.uploadToken ?? "",
          uploadedPartIds,
        },
      }),
    });
    if (!finRes.ok) {
      const msg = await finRes.text().catch(() => "");
      throw new Error(
        `LinkedIn video finalize failed (${finRes.status}): ${msg.slice(0, 200)}`,
      );
    }

    await this.waitForVideo(accessToken, videoUrn);
    return videoUrn;
  }

  private async waitForVideo(accessToken: string, videoUrn: string) {
    const encoded = encodeURIComponent(videoUrn);
    for (let i = 0; i < 90; i++) {
      const res = await fetch(`${VIDEOS_URL}/${encoded}`, {
        headers: this.restHeaders(accessToken),
      });
      const json = (await res.json().catch(() => ({}))) as {
        status?: string;
        processingFailureReason?: string;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(
          json.message ?? `LinkedIn video status failed (${res.status})`,
        );
      }
      if (json.status === "AVAILABLE") return;
      if (json.status === "PROCESSING_FAILED") {
        throw new Error(
          json.processingFailureReason ?? "LinkedIn rejected this video",
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    throw new Error("LinkedIn is still processing this video");
  }

  protected authScopes() {
    return MEMBER_SCOPES;
  }

  protected authorUrn(platformId: string) {
    return `urn:li:person:${platformId}`;
  }

  protected async accountFromTokens(tokens: LinkedInTokens): Promise<AuthResult> {
    return this.profileFromAccessToken(tokens);
  }

  protected restHeaders(accessToken: string) {
    return {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Linkedin-Version": LINKEDIN_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    };
  }

  protected clientId() {
    return this.config.get<string>("LINKEDIN_CLIENT_ID")?.trim() ?? "";
  }

  protected clientSecret() {
    return this.config.get<string>("LINKEDIN_CLIENT_SECRET")?.trim() ?? "";
  }

  protected async exchange(body: Record<string, string>): Promise<LinkedInTokens> {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body),
    });
    const raw = await res.text();
    let json: {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      id_token?: string;
      error?: string;
      error_description?: string;
    } = {};
    try {
      json = JSON.parse(raw) as typeof json;
    } catch {
      throw new Error(raw.slice(0, 160) || "LinkedIn token exchange failed");
    }
    if (!res.ok || !json.access_token) {
      throw new Error(
        json.error_description || json.error || "LinkedIn token exchange failed",
      );
    }
    return {
      access_token: json.access_token,
      refresh_token: json.refresh_token,
      expires_in: json.expires_in,
      id_token: json.id_token,
    };
  }

  protected async profileFromAccessToken(tokens: LinkedInTokens): Promise<AuthResult> {
    const fromUserinfo = await this.oidcProfile(tokens.access_token);
    const fromIdToken = claimsFromIdToken(tokens.id_token);
    const sub = fromUserinfo?.sub || fromIdToken?.sub;
    if (!sub) {
      throw new Error(
        fromUserinfo?.error ||
          "LinkedIn profile lookup failed. Enable Sign In with LinkedIn using OpenID Connect.",
      );
    }
    const displayName =
      fromUserinfo?.name ||
      fromIdToken?.name ||
      [fromUserinfo?.given_name ?? fromIdToken?.given_name, fromUserinfo?.family_name ?? fromIdToken?.family_name]
        .filter(Boolean)
        .join(" ") ||
      fromUserinfo?.email ||
      fromIdToken?.email ||
      "LinkedIn";

    return {
      platformId: sub,
      username: fromUserinfo?.email ?? fromIdToken?.email ?? sub,
      displayName,
      avatar: fromUserinfo?.picture ?? fromIdToken?.picture,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry: expiryFromSeconds(tokens.expires_in),
    };
  }

  private async oidcProfile(accessToken: string) {
    const res = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = (await res.json().catch(() => ({}))) as {
      sub?: string;
      name?: string;
      given_name?: string;
      family_name?: string;
      picture?: string;
      email?: string;
      error?: string;
      error_description?: string;
    };
    if (!res.ok) {
      return {
        error: json.error_description || json.error || `LinkedIn userinfo failed (${res.status})`,
      };
    }
    return json;
  }
}

function mediaRef(id: string, alt?: string) {
  const altText = cleanAltText(alt);
  return altText ? { id, altText } : { id };
}

function claimsFromIdToken(idToken?: string) {
  if (!idToken) return null;
  const part = idToken.split(".")[1];
  if (!part) return null;
  try {
    const padded = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as {
      sub?: string;
      name?: string;
      email?: string;
      picture?: string;
      given_name?: string;
      family_name?: string;
    };
  } catch {
    return null;
  }
}

/**
 * Escape special characters for LinkedIn's commentary field.
 * LinkedIn treats certain chars as rich-text formatting tokens and silently
 * truncates content at the first unescaped one.
 */
function escapeLinkedInText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/</g, "\\<")
    .replace(/>/g, "\\>")
    .replace(/#/g, "\\#")
    .replace(/~/g, "\\~")
    .replace(/_/g, "\\_")
    .replace(/\|/g, "\\|")
    .replace(/\[/g, "\\[")
    .replace(/]/g, "\\]")
    .replace(/\*/g, "\\*")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/@/g, "\\@");
}
