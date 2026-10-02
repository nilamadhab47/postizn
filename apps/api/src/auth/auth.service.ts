import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { EntitlementsService } from "../plan/entitlements.service";
import { trialStartData } from "../plan/entitlements";
import { MailService } from "../mail/mail.service";

export type GoogleProfile = {
  googleId: string;
  email: string;
  name?: string;
  image?: string;
  emailVerified?: boolean;
};

export type OauthProvider = "google" | "linkedin" | "twitter";

export type OauthProfile = {
  provider: OauthProvider;
  providerId: string;
  email?: string;
  name?: string;
  image?: string;
  emailVerified?: boolean;
};

export const SESSION_COOKIE = "postn_session";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const ALLOWED_TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "UTC",
  "Europe/London",
  "America/New_York",
] as const;

export type CredentialsInput = {
  email: string;
  password: string;
  name?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly entitlements: EntitlementsService,
    private readonly mail: MailService,
  ) {}

  isGoogleConfigured() {
    const id = this.config.get<string>("GOOGLE_CLIENT_ID");
    const secret = this.config.get<string>("GOOGLE_CLIENT_SECRET");
    return Boolean(id && secret && !id.startsWith("your_"));
  }

  cookieOptions() {
    const isProd = this.config.get("NODE_ENV") === "production";
    return {
      httpOnly: true as const,
      sameSite: "lax" as const,
      secure: isProd,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  }

  clearCookieOptions() {
    const isProd = this.config.get("NODE_ENV") === "production";
    return {
      httpOnly: true as const,
      sameSite: "lax" as const,
      secure: isProd,
      path: "/",
    };
  }

  async register(input: CredentialsInput) {
    const email = this.requireEmail(input.email);
    const password = this.requirePassword(input.password);
    const name = input.name?.trim() || null;

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, name, plan: "FREE", ...trialStartData() },
    });
    this.mail.welcome(user);
    return user;
  }

  async login(input: CredentialsInput) {
    const email = this.requireEmail(input.email);
    const password = input.password ?? "";

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) {
      throw new UnauthorizedException("Email or password is incorrect");
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("Email or password is incorrect");
    }

    return user;
  }

  async upsertGoogleUser(profile: GoogleProfile) {
    return this.upsertOauthUser({
      provider: "google",
      providerId: profile.googleId,
      email: profile.email,
      name: profile.name,
      image: profile.image,
      emailVerified: profile.emailVerified,
    });
  }

  async upsertOauthUser(profile: OauthProfile) {
    const email = this.oauthEmail(profile);
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [this.oauthIdWhere(profile), ...(email ? [{ email }] : [])],
      },
    });

    const verifiedAt = profile.emailVerified ? new Date() : undefined;
    const ids = this.oauthIds(profile);

    if (existing) {
      const alreadyLinked = this.linkedId(existing, profile.provider);
      if (alreadyLinked && alreadyLinked !== profile.providerId) {
        throw new ConflictException(
          "This email is already linked to a different account",
        );
      }
      return this.prisma.user.update({
        where: { id: existing.id },
        data: {
          ...ids,
          name: existing.name ?? profile.name,
          image: existing.image ?? profile.image,
          emailVerified: verifiedAt ?? existing.emailVerified,
        },
      });
    }

    const user = await this.prisma.user.create({
      data: {
        email: email ?? this.syntheticEmail(profile),
        ...ids,
        name: profile.name,
        image: profile.image,
        emailVerified: verifiedAt ?? null,
        plan: "FREE",
        ...trialStartData(),
      },
    });
    this.mail.welcome(user);
    return user;
  }

  async updateProfile(
    userId: string,
    input: { name?: string; timezone?: string; image?: string | null },
  ) {
    const data: {
      name?: string | null;
      timezone?: string;
      image?: string | null;
    } = {};

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) {
        throw new BadRequestException("Enter your name");
      }
      if (name.length > 80) {
        throw new BadRequestException("Name must be under 80 characters");
      }
      data.name = name;
    }

    if (input.timezone !== undefined) {
      if (!(ALLOWED_TIMEZONES as readonly string[]).includes(input.timezone)) {
        throw new BadRequestException("Pick a timezone from the list");
      }
      data.timezone = input.timezone;
    }

    if (input.image !== undefined) {
      if (input.image === null || input.image === "") {
        data.image = null;
      } else if (!/^https?:\/\//i.test(input.image)) {
        throw new BadRequestException("Photo URL is not valid");
      } else {
        data.image = input.image;
      }
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException("Nothing to update");
    }

    await this.prisma.user.update({ where: { id: userId }, data });
    return this.getMe(userId);
  }

  signSession(userId: string) {
    return this.jwt.sign({ sub: userId });
  }

  async getMe(userId: string) {
    const [user, channels, posts, access] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          plan: true,
          timezone: true,
          createdAt: true,
          emailVerified: true,
          passwordHash: true,
          googleId: true,
          linkedinId: true,
          twitterId: true,
        },
      }),
      this.prisma.socialAccount.count({
        where: { userId, isActive: true, pausedByPlan: false },
      }),
      this.prisma.post.count({ where: { userId } }),
      this.entitlements.resolve(userId),
    ]);

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      plan: access.access,
      timezone: user.timezone,
      createdAt: user.createdAt.toISOString(),
      emailVerified: Boolean(user.emailVerified),
      hasPassword: Boolean(user.passwordHash),
      logins: {
        google: Boolean(user.googleId),
        linkedin: Boolean(user.linkedinId),
        twitter: Boolean(user.twitterId),
      },
      setup: { channels, posts },
      entitlements: {
        plan: access.access,
        access: access.access,
        billingExempt: access.billingExempt,
        trialEndsAt: access.trialEndsAt,
        trialDaysRemaining: access.trialDaysRemaining,
        channelLimit: access.channelLimit,
        postsPerDay: access.postsPerDay,
        postsToday: access.postsToday,
        postsTodayRemaining: access.postsTodayRemaining,
        postsPerMonth: access.postsPerMonth,
        postsUsed: access.postsUsed,
        postsRemaining: access.postsRemaining,
        imageCap: access.imageCap,
        imageUsed: access.imageUsed,
        imageRemaining: access.imageRemaining,
        aiCap: access.aiCap,
        aiUsed: access.aiUsed,
        aiRemaining: access.aiRemaining,
        canUsePaidChannel: access.canUsePaidChannel,
        freeChannels: access.freeChannels,
        proChannels: access.proChannels,
      },
    };
  }

  private requireEmail(raw: string) {
    const email = raw?.trim().toLowerCase() ?? "";
    if (!EMAIL_RE.test(email)) {
      throw new BadRequestException("Enter a valid email");
    }
    return email;
  }

  private requirePassword(password: string) {
    if (!password || password.length < 8) {
      throw new BadRequestException("Password must be at least 8 characters");
    }
    return password;
  }

  private oauthEmail(profile: OauthProfile) {
    const email = profile.email?.trim().toLowerCase() ?? "";
    if (!EMAIL_RE.test(email)) return undefined;
    return email;
  }

  private syntheticEmail(profile: OauthProfile) {
    const host =
      profile.provider === "linkedin"
        ? "linkedin"
        : profile.provider === "google"
          ? "google"
          : "x";
    return `${host}.${profile.providerId}@signin.postn.invalid`;
  }

  private oauthIdWhere(profile: OauthProfile) {
    if (profile.provider === "google") return { googleId: profile.providerId };
    if (profile.provider === "linkedin") return { linkedinId: profile.providerId };
    return { twitterId: profile.providerId };
  }

  private oauthIds(profile: OauthProfile) {
    return {
      googleId: profile.provider === "google" ? profile.providerId : undefined,
      linkedinId: profile.provider === "linkedin" ? profile.providerId : undefined,
      twitterId: profile.provider === "twitter" ? profile.providerId : undefined,
    };
  }

  private linkedId(
    user: { googleId: string | null; linkedinId: string | null; twitterId: string | null },
    provider: OauthProvider,
  ) {
    if (provider === "google") return user.googleId;
    if (provider === "linkedin") return user.linkedinId;
    return user.twitterId;
  }
}
