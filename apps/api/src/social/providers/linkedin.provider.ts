import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Platform } from "@prisma/client";
import { BaseProvider, type AuthResult, type UploadInput } from "./base-provider";
import type { ChannelPlan } from "../channel-catalog";
import { expiryFromSeconds, hasKey } from "./pkce";

const AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
const POSTS_URL = "https://api.linkedin.com/rest/posts";
const IMAGES_URL = "https://api.linkedin.com/rest/images?action=initializeUpload";
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

  constructor(protected readonly config: ConfigService) {
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

  async publishPost(input: {
    content: string;
    mediaUrls: string[];
    accessToken: string;
    platformId: string;
  }) {
    let mediaContent: Record<string, unknown> = {};

    const imageUrl = input.mediaUrls[0];
    if (imageUrl) {
      const imageUrn = await this.uploadImage(
        input.accessToken,
        input.platformId,
        imageUrl,
      );
      if (imageUrn) {
        mediaContent = { content: { media: { id: imageUrn } } };
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

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      throw new Error(`Could not fetch image from ${imageUrl}`);
    }
    const imgBuf = Buffer.from(await imgRes.arrayBuffer());
    const contentType =
      imgRes.headers.get("content-type") ?? "application/octet-stream";

    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": contentType,
      },
      body: imgBuf,
    });
    if (!putRes.ok && putRes.status !== 201) {
      throw new Error(`LinkedIn image PUT failed (${putRes.status})`);
    }

    return imageUrn;
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
