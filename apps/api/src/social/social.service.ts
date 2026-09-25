import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Platform } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { decryptSecret, encryptSecret, keyFromSecret } from "./token-crypto";
import { OauthStateStore } from "./oauth-state.store";
import { ProviderRegistry } from "./providers/provider.registry";
import { newCodeVerifier } from "./providers/pkce";
import type { AuthResult, BaseProvider } from "./providers/base-provider";
import { SOON_CHANNELS, GONE_CHANNELS } from "./channel-catalog";
import {
  canUsePaidChannel,
  channelLimit,
} from "../plan/entitlements";

@Injectable()
export class SocialService {
  private readonly log = new Logger(SocialService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly registry: ProviderRegistry,
    private readonly oauthState: OauthStateStore,
  ) {}

  catalog(userId: string) {
    return this.buildCatalog(userId);
  }

  async startConnect(userId: string, slug: string) {
    const provider = this.requireProvider(slug);
    const user = await this.requireUser(userId);
    const existing = await this.prisma.socialAccount.findFirst({
      where: { userId, platform: provider.platform },
    });
    this.assertPlan(user.plan, provider);
    await this.assertChannelCap(userId, user.plan, Boolean(existing));

    if (provider.connectMode === "token") {
      throw new BadRequestException("This channel uses a token form");
    }

    if (!provider.isConfigured()) {
      await this.upsertAccount(userId, provider, mockProfile(user, provider), true);
      return { kind: "redirect" as const, url: this.accountsRedirect("demo", provider.slug) };
    }

    const codeVerifier = newCodeVerifier();
    const state = this.oauthState.create(userId, provider.platform, codeVerifier);
    const url = provider.createAuthUrl({
      state,
      codeVerifier,
      redirectUri: this.callbackUrl(provider.slug),
    });
    return { kind: "redirect" as const, url };
  }

  async connectToken(userId: string, slug: string, fields: Record<string, string>) {
    const provider = this.requireProvider(slug);
    const user = await this.requireUser(userId);
    if (provider.connectMode !== "token") {
      throw new BadRequestException("This channel uses OAuth");
    }
    const existing = await this.prisma.socialAccount.findFirst({
      where: { userId, platform: provider.platform },
    });
    this.assertPlan(user.plan, provider);
    await this.assertChannelCap(userId, user.plan, Boolean(existing));

    try {
      const profile = await provider.authenticateToken(fields);
      await this.upsertAccount(userId, provider, profile, false);
      return { ok: true as const, platform: provider.slug };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not connect";
      throw new BadRequestException(message);
    }
  }

  async testPublish(userId: string, accountId: string, content?: string) {
    const account = await this.prisma.socialAccount.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) {
      throw new NotFoundException("Channel not found");
    }
    if (account.isMock) {
      throw new BadRequestException("Reconnect the live channel before sending a test");
    }
    const provider = this.registry.getByPlatform(account.platform);
    if (!provider) {
      throw new NotFoundException("Unknown platform");
    }
    const key = this.cryptoKey();
    const accessToken = decryptSecret(account.accessToken, key);
    const text =
      (content?.trim() || `postN test · ${new Date().toISOString()}`).slice(0, 2000);
    try {
      const result = await provider.publishPost({
        content: text,
        mediaUrls: [],
        accessToken,
        platformId: account.platformId,
      });
      return { ok: true as const, platformPostId: result.platformPostId };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Publish failed";
      throw new BadRequestException(message);
    }
  }

  async handleCallback(slug: string, code: string | undefined, state: string | undefined) {
    const provider = this.requireProvider(slug);
    if (!code || !state) {
      return this.accountsRedirect("missing_code", slug);
    }

    const pending = this.oauthState.take(state);
    if (!pending || pending.platform !== provider.platform) {
      return this.accountsRedirect("expired_state", slug);
    }

    try {
      const profile = await provider.authenticate({
        code,
        codeVerifier: pending.codeVerifier,
        redirectUri: this.callbackUrl(provider.slug),
      });
      await this.upsertAccount(pending.userId, provider, profile, false);
      return this.accountsRedirect("connected", slug);
    } catch (err) {
      const message = err instanceof Error ? err.message : "oauth_failed";
      this.log.warn(`${slug} oauth failed: ${message}`);
      if (message === "NO_PAGE") return this.accountsRedirect("no_page", slug);
      if (message === "SCOPE_DENIED") return this.accountsRedirect("scope_denied", slug);
      return this.accountsRedirect("oauth_failed", slug, message);
    }
  }

  async disconnect(userId: string, accountId: string) {
    const account = await this.prisma.socialAccount.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) {
      throw new NotFoundException("Channel not found");
    }
    await this.prisma.socialAccount.delete({ where: { id: account.id } });
    return { ok: true };
  }

  async decryptedTokens(accountId: string) {
    const account = await this.prisma.socialAccount.findUnique({
      where: { id: accountId },
    });
    if (!account) {
      throw new NotFoundException("Channel not found");
    }
    const key = this.cryptoKey();
    return {
      account,
      accessToken: decryptSecret(account.accessToken, key),
      refreshToken: account.refreshToken
        ? decryptSecret(account.refreshToken, key)
        : null,
    };
  }

  private async buildCatalog(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    const accounts = await this.prisma.socialAccount.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    const byPlatform = new Map(accounts.map((row) => [row.platform, row]));
    const limit = channelLimit(user?.plan === "PRO" ? "PRO" : "FREE");
    const used = accounts.length;

    return {
      plan: user?.plan === "PRO" ? "PRO" : "FREE",
      limit,
      used,
      providers: [
        ...this.registry.all().map((provider) => {
          const account = byPlatform.get(provider.platform);
          const locked =
            provider.plan === "PRO" && !canUsePaidChannel(user?.plan === "PRO" ? "PRO" : "FREE");
          return {
            slug: provider.slug,
            platform: provider.platform,
            label: provider.label,
            plan: provider.plan,
            connectMode: provider.connectMode,
            blurb: provider.blurb,
            configured: provider.isConfigured(),
            locked,
            tokenFields: provider.tokenFields,
            account: account ? publicAccount(account) : null,
          };
        }),
        ...SOON_CHANNELS.map((row) => ({
          slug: row.slug,
          platform: row.slug.toUpperCase().replace(/-/g, "_"),
          label: row.label,
          plan: row.plan,
          connectMode: "soon" as const,
          blurb: row.blurb,
          configured: false,
          locked: !canUsePaidChannel(user?.plan === "PRO" ? "PRO" : "FREE"),
          tokenFields: [],
          account: null,
        })),
        ...GONE_CHANNELS.map((row) => ({
          slug: row.slug,
          platform: row.slug.toUpperCase().replace(/-/g, "_"),
          label: row.label,
          plan: row.plan,
          connectMode: "gone" as const,
          blurb: row.blurb,
          configured: false,
          locked: false,
          tokenFields: [],
          account: null,
        })),
      ],
    };
  }

  private async upsertAccount(
    userId: string,
    provider: BaseProvider,
    profile: AuthResult,
    isMock: boolean,
  ) {
    const key = this.cryptoKey();
    const data = {
      platformId: profile.platformId,
      username: profile.username,
      displayName: profile.displayName,
      avatar: profile.avatar ?? null,
      accessToken: encryptSecret(profile.accessToken, key),
      refreshToken: profile.refreshToken
        ? encryptSecret(profile.refreshToken, key)
        : null,
      tokenExpiry: profile.tokenExpiry ?? null,
      isActive: true,
      isMock,
    };

    const existing = await this.prisma.socialAccount.findFirst({
      where: { userId, platform: provider.platform },
    });

    if (existing) {
      await this.prisma.socialAccount.update({
        where: { id: existing.id },
        data,
      });
      return;
    }

    await this.prisma.socialAccount.create({
      data: {
        userId,
        platform: provider.platform,
        ...data,
      },
    });
  }

  private async requireUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, plan: true },
    });
    if (!user) {
      throw new NotFoundException("Account not found");
    }
    return user;
  }

  private assertPlan(plan: "FREE" | "PRO", provider: BaseProvider) {
    if (provider.plan === "PRO" && !canUsePaidChannel(plan)) {
      throw new ForbiddenException("This channel is on PRO");
    }
  }

  private async assertChannelCap(
    userId: string,
    plan: "FREE" | "PRO",
    replacing: boolean,
  ) {
    if (replacing) return;
    const used = await this.prisma.socialAccount.count({ where: { userId } });
    const limit = channelLimit(plan);
    if (used >= limit) {
      throw new ForbiddenException(`Channel limit reached (${limit})`);
    }
  }

  private requireProvider(slug: string) {
    const provider = this.registry.getBySlug(slug);
    if (!provider) {
      throw new NotFoundException("Unknown platform");
    }
    return provider;
  }

  private callbackUrl(slug: string) {
    const fallback = `http://localhost:4000/social/callback/${slug}`;
    const envName =
      slug === "linkedin"
        ? "LINKEDIN_CALLBACK_URL"
        : slug === "linkedin-page"
          ? "LINKEDIN_PAGE_CALLBACK_URL"
          : slug === "twitter"
            ? "TWITTER_CALLBACK_URL"
            : "";
    if (!envName) return fallback;
    return this.config.get<string>(envName)?.trim() || fallback;
  }

  accountsRedirect(status: string, platform: string, detail?: string) {
    const frontend = this.config.get<string>("FRONTEND_URL") ?? "http://localhost:3000";
    const params = new URLSearchParams({ status, platform });
    if (detail) params.set("detail", detail.replace(/\s+/g, " ").slice(0, 180));
    return `${frontend}/accounts?${params.toString()}`;
  }

  private cryptoKey() {
    const secret =
      this.config.get<string>("TOKEN_ENCRYPTION_KEY")?.trim() ||
      this.config.get<string>("JWT_SECRET") ||
      "dev-only-change-me";
    return keyFromSecret(secret);
  }
}

function publicAccount(row: {
  id: string;
  platform: Platform;
  platformId: string;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
  isActive: boolean;
  isMock?: boolean;
}) {
  return {
    id: row.id,
    platform: row.platform,
    platformId: row.platformId,
    username: row.username,
    displayName: row.displayName,
    avatar: row.avatar,
    isActive: row.isActive,
    isMock: Boolean(row.isMock),
  };
}

function mockProfile(
  user: { id: string; name: string | null; email: string },
  provider: BaseProvider,
): AuthResult {
  const handle = `demo-${provider.slug}`;
  return {
    platformId: `mock:${user.id}:${provider.slug}`,
    username: handle,
    displayName: user.name || user.email.split("@")[0] || provider.label,
    accessToken: `mock-access-${provider.slug}`,
    refreshToken: `mock-refresh-${provider.slug}`,
    tokenExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };
}
