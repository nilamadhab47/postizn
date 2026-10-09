import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { SocialAccount } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  decryptSecretWithKeys,
  encryptSecret,
  keyFromSecret,
} from "./token-crypto";
import { publicAccount } from "./public-account";
import {
  allowPlaintextSecrets,
  tokenEncryptionSecretFrom,
} from "../config/secrets";
import { OauthStateStore } from "./oauth-state.store";
import { ProviderRegistry } from "./providers/provider.registry";
import { newCodeVerifier } from "./providers/pkce";
import type { AuthResult, BaseProvider } from "./providers/base-provider";
import { SOON_CHANNELS, GONE_CHANNELS } from "./channel-catalog";
import { EntitlementsService } from "../plan/entitlements.service";
import { PAY_TO_USE } from "../plan/entitlements";
import type { ChannelSettings } from "@postn/shared";

@Injectable()
export class SocialService {
  private readonly log = new Logger(SocialService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly registry: ProviderRegistry,
    private readonly oauthState: OauthStateStore,
    private readonly entitlements: EntitlementsService,
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
    const access = await this.entitlements.syncChannelAccess(userId);
    if (access.access === "FREE") {
      throw new ForbiddenException(PAY_TO_USE);
    }
    this.assertPlan(access.canUsePaidChannel, provider);
    await this.assertChannelCap(userId, access.channelLimit, Boolean(existing));

    if (provider.connectMode === "token") {
      throw new BadRequestException("This channel uses a token form");
    }

    if (!provider.isConfigured()) {
      await this.upsertAccount(userId, provider, mockProfile(user, provider), true);
      return { kind: "redirect" as const, url: this.accountsRedirect("demo", provider.slug) };
    }

    const codeVerifier = newCodeVerifier();
    const state = await this.oauthState.create(userId, provider.platform, codeVerifier);
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
    const access = await this.entitlements.syncChannelAccess(userId);
    if (access.access === "FREE") {
      throw new ForbiddenException(PAY_TO_USE);
    }
    this.assertPlan(access.canUsePaidChannel, provider);
    await this.assertChannelCap(userId, access.channelLimit, Boolean(existing));

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
    if (account.pausedByPlan) {
      throw new ForbiddenException(PAY_TO_USE);
    }
    const text =
      (content?.trim() || `postN test · ${new Date().toISOString()}`).slice(0, 2000);
    try {
      const result = await this.publishToAccount(account, text, []);
      return { ok: true as const, platformPostId: result.platformPostId };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Publish failed";
      throw new BadRequestException(message);
    }
  }

  async publishToAccount(
    account: SocialAccount,
    content: string,
    media: { url: string; mimeType: string; bytes: number; alt?: string }[] = [],
    settings: ChannelSettings = {},
  ) {
    if (account.pausedByPlan) {
      throw new Error(PAY_TO_USE);
    }
    if (account.isMock) {
      throw new Error("Reconnect the live channel before publishing");
    }
    const ready = await this.ensureFreshAccount(account);
    const provider = this.registry.getByPlatform(ready.platform);
    if (!provider) {
      throw new Error("Unknown platform");
    }
    const access = this.openSecret(ready.accessToken);
    const refresh = ready.refreshToken
      ? this.openSecret(ready.refreshToken)
      : null;
    const mediaUrls = media.map((item) => item.url);
    await this.persistRotatedSecrets(
      ready,
      access.plain,
      refresh?.plain ?? null,
      access.rotated,
      Boolean(refresh?.rotated),
    );
    return provider.publishPost({
      content,
      mediaUrls,
      media,
      settings,
      accessToken: access.plain,
      platformId: ready.platformId,
    });
  }

  private async ensureFreshAccount(account: SocialAccount): Promise<SocialAccount> {
    const skewMs = 5 * 60 * 1000;
    if (!account.tokenExpiry || account.tokenExpiry.getTime() > Date.now() + skewMs) {
      return account;
    }
    const provider = this.registry.getByPlatform(account.platform);
    if (!provider) {
      throw new Error("Unknown platform");
    }
    if (provider.connectMode === "token") {
      return account;
    }
    if (!account.refreshToken) {
      throw new Error("Reconnect this channel — the login expired");
    }
    const key = this.cryptoKey();
    const refresh = this.openSecret(account.refreshToken);
    try {
      const next = await provider.refreshToken(refresh.plain);
      return this.prisma.socialAccount.update({
        where: { id: account.id },
        data: {
          accessToken: encryptSecret(next.accessToken, key),
          refreshToken: next.refreshToken
            ? encryptSecret(next.refreshToken, key)
            : undefined,
          tokenExpiry: next.tokenExpiry ?? null,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "refresh failed";
      this.log.warn(`token refresh failed ${account.platform}: ${message}`);
      throw new Error("Reconnect this channel — the login expired");
    }
  }

  async handleCallback(slug: string, code: string | undefined, state: string | undefined) {
    const provider = this.requireProvider(slug);
    if (!code || !state) {
      return this.accountsRedirect("missing_code", slug);
    }

    const pending = await this.oauthState.take(state);
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
      return this.accountsRedirect("oauth_failed", slug);
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

  private async buildCatalog(userId: string) {
    const access = await this.entitlements.syncChannelAccess(userId);
    const accounts = await this.prisma.socialAccount.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    const byPlatform = new Map(accounts.map((row) => [row.platform, row]));
    const used = accounts.filter((row) => row.isActive && !row.pausedByPlan).length;

    return {
      plan: access.access,
      limit: access.channelLimit,
      used,
      providers: [
        ...this.registry.all().map((provider) => {
          const account = byPlatform.get(provider.platform);
          const locked =
            access.access === "FREE" || (provider.plan === "PRO" && !access.canUsePaidChannel);
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
          locked: access.access === "FREE" || !access.canUsePaidChannel,
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
      pausedByPlan: false,
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

  private assertPlan(canUsePaid: boolean, provider: BaseProvider) {
    if (provider.plan === "PRO" && !canUsePaid) {
      throw new ForbiddenException("This channel is on Pro");
    }
  }

  private async assertChannelCap(
    userId: string,
    limit: number,
    replacing: boolean,
  ) {
    if (replacing) return;
    const used = await this.prisma.socialAccount.count({
      where: { userId, ...this.entitlements.usableWhere() },
    });
    if (used >= limit) {
      throw new ForbiddenException(limit === 0 ? PAY_TO_USE : `Channel limit reached (${limit})`);
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
    return keyFromSecret(tokenEncryptionSecretFrom(this.config));
  }

  private decryptKeys() {
    const keys = [this.cryptoKey()];
    const jwt = this.config.get<string>("JWT_SECRET")?.trim();
    if (jwt) {
      const legacy = keyFromSecret(jwt);
      if (!legacy.equals(keys[0])) keys.push(legacy);
    }
    return keys;
  }

  private openSecret(value: string) {
    return decryptSecretWithKeys(value, this.decryptKeys(), {
      allowPlaintext: allowPlaintextSecrets(),
    });
  }

  private async persistRotatedSecrets(
    account: SocialAccount,
    accessToken: string,
    refreshToken: string | null,
    rotatedAccess: boolean,
    rotatedRefresh: boolean,
  ) {
    if (!rotatedAccess && !rotatedRefresh) return;
    const key = this.cryptoKey();
    await this.prisma.socialAccount.update({
      where: { id: account.id },
      data: {
        accessToken: encryptSecret(accessToken, key),
        ...(rotatedRefresh
          ? {
              refreshToken: refreshToken
                ? encryptSecret(refreshToken, key)
                : null,
            }
          : {}),
      },
    });
  }
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
