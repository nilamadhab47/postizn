import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { challenge, hasKey, newCodeVerifier } from "../social/providers/pkce";
import { AuthService, type OauthProfile } from "./auth.service";
import {
  LoginOauthStateStore,
  type LoginOauthProvider,
} from "./login-oauth-state.store";

const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
const LINKEDIN_LOGIN_SCOPES = ["openid", "profile", "email"];

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const GOOGLE_LOGIN_SCOPES = ["openid", "email", "profile"];

const X_AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const X_TOKEN_URL = "https://api.x.com/2/oauth2/token";
const X_ME_URL =
  "https://api.x.com/2/users/me?user.fields=profile_image_url,name,username";
const X_LOGIN_SCOPES = ["tweet.read", "users.read", "offline.access"];

export type LoginOauthResult =
  | { kind: "ok"; userId: string }
  | { kind: "error"; url: string };

@Injectable()
export class OauthLoginService {
  private readonly log = new Logger(OauthLoginService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly auth: AuthService,
    private readonly oauthState: LoginOauthStateStore,
  ) {}

  providers() {
    return {
      google: this.isGoogleConfigured(),
      linkedin: this.isLinkedInConfigured(),
      twitter: this.isTwitterConfigured(),
    };
  }

  authorizeUrl(provider: LoginOauthProvider) {
    if (!this.isConfigured(provider)) {
      return this.failUrl("not_configured");
    }

    const codeVerifier = provider === "twitter" ? newCodeVerifier() : "";
    const state = this.oauthState.create(provider, codeVerifier);
    if (provider === "google") return this.googleAuthorizeUrl(state);
    if (provider === "linkedin") return this.linkedinAuthorizeUrl(state);
    return this.twitterAuthorizeUrl(state, codeVerifier);
  }

  async finish(
    provider: LoginOauthProvider,
    input: { code?: string; state?: string; error?: string },
  ): Promise<LoginOauthResult> {
    if (input.error) {
      const status =
        input.error === "access_denied" || input.error === "user_cancelled_login"
          ? "denied"
          : "failed";
      return { kind: "error", url: this.failUrl(status) };
    }
    if (!input.code || !input.state) {
      return { kind: "error", url: this.failUrl("missing") };
    }

    const pending = this.oauthState.take(input.state);
    if (!pending || pending.provider !== provider) {
      return { kind: "error", url: this.failUrl("expired") };
    }

    try {
      const profile =
        provider === "google"
          ? await this.googleProfile(input.code)
          : provider === "linkedin"
            ? await this.linkedinProfile(input.code)
            : await this.twitterProfile(input.code, pending.codeVerifier);
      const user = await this.auth.upsertOauthUser(profile);
      return { kind: "ok", userId: user.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : "oauth_failed";
      this.log.warn(`${provider} login failed: ${message}`);
      return { kind: "error", url: this.failUrl("failed") };
    }
  }

  successUrl() {
    return `${this.frontendUrl()}/dashboard`;
  }

  failUrl(reason: string) {
    const params = new URLSearchParams({ error: `oauth_${reason}` });
    return `${this.frontendUrl()}/login?${params.toString()}`;
  }

  private isConfigured(provider: LoginOauthProvider) {
    if (provider === "google") return this.isGoogleConfigured();
    if (provider === "linkedin") return this.isLinkedInConfigured();
    return this.isTwitterConfigured();
  }

  private isGoogleConfigured() {
    return hasKey(this.googleClientId()) && hasKey(this.googleClientSecret());
  }

  private isLinkedInConfigured() {
    return hasKey(this.linkedinClientId()) && hasKey(this.linkedinClientSecret());
  }

  private isTwitterConfigured() {
    return hasKey(this.twitterClientId()) && hasKey(this.twitterClientSecret());
  }

  private googleAuthorizeUrl(state: string) {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.googleClientId(),
      redirect_uri: this.googleCallbackUrl(),
      scope: GOOGLE_LOGIN_SCOPES.join(" "),
      state,
      prompt: "select_account",
    });
    return `${GOOGLE_AUTH_URL}?${params.toString().replace(/\+/g, "%20")}`;
  }

  private linkedinAuthorizeUrl(state: string) {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.linkedinClientId(),
      redirect_uri: this.linkedinCallbackUrl(),
      state,
      scope: LINKEDIN_LOGIN_SCOPES.join(" "),
    });
    return `${LINKEDIN_AUTH_URL}?${params.toString().replace(/\+/g, "%20")}`;
  }

  private twitterAuthorizeUrl(state: string, codeVerifier: string) {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.twitterClientId(),
      redirect_uri: this.twitterCallbackUrl(),
      scope: X_LOGIN_SCOPES.join(" "),
      state,
      code_challenge: challenge(codeVerifier),
      code_challenge_method: "S256",
    });
    return `${X_AUTH_URL}?${params.toString()}`;
  }

  private async googleProfile(code: string): Promise<OauthProfile> {
    const tokens = await this.googleExchange(code);
    const res = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const json = (await res.json().catch(() => ({}))) as {
      sub?: string;
      email?: string;
      email_verified?: boolean | string;
      name?: string;
      picture?: string;
      error?: string;
      error_description?: string;
    };
    if (!res.ok || !json.sub) {
      throw new Error(
        json.error_description || json.error || "Google profile lookup failed",
      );
    }
    if (!json.email) {
      throw new Error("Google profile did not include an email");
    }
    return {
      provider: "google",
      providerId: json.sub,
      email: json.email,
      name: json.name,
      image: json.picture,
      emailVerified: json.email_verified === true || json.email_verified === "true",
    };
  }

  private async googleExchange(code: string) {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: this.googleCallbackUrl(),
        client_id: this.googleClientId(),
        client_secret: this.googleClientSecret(),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!res.ok || !json.access_token) {
      throw new Error(
        json.error_description || json.error || "Google token exchange failed",
      );
    }
    return { access_token: json.access_token };
  }

  private async linkedinProfile(code: string): Promise<OauthProfile> {
    const tokens = await this.linkedinExchange(code);
    const res = await fetch(LINKEDIN_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const json = (await res.json().catch(() => ({}))) as {
      sub?: string;
      email?: string;
      email_verified?: boolean | string;
      name?: string;
      given_name?: string;
      family_name?: string;
      picture?: string;
      error?: string;
      error_description?: string;
    };
    const sub = json.sub;
    if (!res.ok || !sub) {
      throw new Error(
        json.error_description || json.error || "LinkedIn profile lookup failed",
      );
    }
    const name =
      json.name ||
      [json.given_name, json.family_name].filter(Boolean).join(" ") ||
      undefined;
    return {
      provider: "linkedin",
      providerId: sub,
      email: json.email,
      name,
      image: json.picture,
      emailVerified: json.email_verified === true || json.email_verified === "true",
    };
  }

  private async linkedinExchange(code: string) {
    const res = await fetch(LINKEDIN_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: this.linkedinCallbackUrl(),
        client_id: this.linkedinClientId(),
        client_secret: this.linkedinClientSecret(),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!res.ok || !json.access_token) {
      throw new Error(
        json.error_description || json.error || "LinkedIn token exchange failed",
      );
    }
    return { access_token: json.access_token };
  }

  private async twitterProfile(
    code: string,
    codeVerifier: string,
  ): Promise<OauthProfile> {
    const tokens = await this.twitterExchange(code, codeVerifier);
    const res = await fetch(X_ME_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const json = (await res.json().catch(() => ({}))) as {
      data?: {
        id: string;
        name?: string;
        username?: string;
        profile_image_url?: string;
      };
      title?: string;
      detail?: string;
    };
    if (!res.ok || !json.data?.id) {
      throw new Error(json.detail || json.title || "X profile lookup failed");
    }
    const avatar = json.data.profile_image_url?.replace("_normal", "_400x400");
    return {
      provider: "twitter",
      providerId: json.data.id,
      name: json.data.name || json.data.username,
      image: avatar,
    };
  }

  private async twitterExchange(code: string, codeVerifier: string) {
    const basic = Buffer.from(
      `${this.twitterClientId()}:${this.twitterClientSecret()}`,
    ).toString("base64");
    const res = await fetch(X_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: this.twitterCallbackUrl(),
        code_verifier: codeVerifier,
        client_id: this.twitterClientId(),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      error_description?: string;
      error?: string;
    };
    if (!res.ok || !json.access_token) {
      throw new Error(
        json.error_description || json.error || "X token exchange failed",
      );
    }
    return { access_token: json.access_token };
  }

  private frontendUrl() {
    return this.config.get<string>("FRONTEND_URL") ?? "http://localhost:3000";
  }

  private backendUrl() {
    return this.config.get<string>("BACKEND_URL") ?? "http://localhost:4000";
  }

  private googleCallbackUrl() {
    return (
      this.config.get<string>("GOOGLE_CALLBACK_URL")?.trim() ||
      `${this.backendUrl()}/auth/google/callback`
    );
  }

  private linkedinCallbackUrl() {
    return (
      this.config.get<string>("LINKEDIN_LOGIN_CALLBACK_URL")?.trim() ||
      `${this.backendUrl()}/auth/linkedin/callback`
    );
  }

  private twitterCallbackUrl() {
    return (
      this.config.get<string>("TWITTER_LOGIN_CALLBACK_URL")?.trim() ||
      `${this.backendUrl()}/auth/twitter/callback`
    );
  }

  private googleClientId() {
    return this.config.get<string>("GOOGLE_CLIENT_ID")?.trim() ?? "";
  }

  private googleClientSecret() {
    return this.config.get<string>("GOOGLE_CLIENT_SECRET")?.trim() ?? "";
  }

  private linkedinClientId() {
    return this.config.get<string>("LINKEDIN_CLIENT_ID")?.trim() ?? "";
  }

  private linkedinClientSecret() {
    return this.config.get<string>("LINKEDIN_CLIENT_SECRET")?.trim() ?? "";
  }

  private twitterClientId() {
    return this.config.get<string>("TWITTER_CLIENT_ID")?.trim() ?? "";
  }

  private twitterClientSecret() {
    return this.config.get<string>("TWITTER_CLIENT_SECRET")?.trim() ?? "";
  }
}
