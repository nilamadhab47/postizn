import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Platform } from "@prisma/client";
import { BaseProvider, type AuthResult, type UploadInput } from "./base-provider";
import { challenge, expiryFromSeconds, hasKey } from "./pkce";

const AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.x.com/2/oauth2/token";
const ME_URL = "https://api.x.com/2/users/me?user.fields=profile_image_url,name,username";
const TWEET_URL = "https://api.x.com/2/tweets";
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
    const res = await fetch(TWEET_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: input.content }),
    });
    const json = (await res.json()) as { data?: { id?: string }; title?: string };
    if (!res.ok || !json.data?.id) {
      throw new Error(json.title ?? `X publish failed (${res.status})`);
    }
    return { platformPostId: json.data.id };
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
