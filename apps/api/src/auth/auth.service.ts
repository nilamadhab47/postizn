import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import { SESSION_COOKIE } from "./auth.constants";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { EntitlementsService } from "../plan/entitlements.service";
import { trialStartData } from "../plan/entitlements";
import { MailService } from "../mail/mail.service";
import { oauthLinkDecision } from "./oauth-link";
import { isWaitlistMode } from "./waitlist-mode";
import { isInviteToken, newInviteToken } from "./invite.rules";

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
    if (isWaitlistMode(this.config)) {
      throw new ForbiddenException(
        "postN is invite-only right now. Use the link we sent you.",
      );
    }
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
      const decision = oauthLinkDecision(existing, profile);
      if (decision.action === "conflict") {
        throw new ConflictException(decision.message);
      }
      return this.prisma.user.update({
        where: { id: existing.id },
        data: {
          ...ids,
          name: existing.name ?? profile.name,
          image: existing.image ?? profile.image,
          emailVerified: verifiedAt ?? existing.emailVerified,
          ...(decision.action === "takeover-unverified"
            ? { passwordHash: null, emailVerified: new Date() }
            : {}),
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

  async signSession(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { sessionVersion: true },
    });
    return this.jwt.sign({ sub: userId, sv: user?.sessionVersion ?? 0 });
  }

  async revokeSessionFromRequest(req: Request) {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) return;
    try {
      const payload = this.jwt.verify(token) as { sub?: string };
      if (!payload.sub) return;
      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { sessionVersion: { increment: 1 } },
      });
    } catch {
      // Cookie already invalid or user gone — still clear it.
    }
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
        promoProEndsAt: access.promoProEndsAt,
        promoDaysRemaining: access.promoDaysRemaining,
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

  async listInvites(actorId: string) {
    await this.requireExempt(actorId);
    const invites = await this.prisma.invite.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { items: invites.map((invite) => this.presentInvite(invite)) };
  }

  async createInvite(actorId: string, input: { email: string; name?: string }) {
    await this.requireExempt(actorId);
    const email = this.requireEmail(input.email);
    const name = input.name?.trim() || null;
    const existing = await this.prisma.invite.findUnique({ where: { email } });
    if (existing) {
      const invite =
        name && !existing.name
          ? await this.prisma.invite.update({
              where: { id: existing.id },
              data: { name },
            })
          : existing;
      return this.presentInvite(invite);
    }
    const invite = await this.prisma.invite.create({
      data: {
        token: newInviteToken(),
        email,
        name,
        createdById: actorId,
      },
    });
    return this.presentInvite(invite);
  }

  async getInvite(token: string) {
    const invite = await this.findInvite(token);
    return {
      email: invite.email,
      name: invite.name,
      accepted: Boolean(invite.acceptedAt),
    };
  }

  async acceptInvite(token: string, input: { password: string; name?: string }) {
    const invite = await this.findInvite(token);
    const password = this.requirePassword(input.password);
    const name = input.name?.trim() || invite.name;

    let user = await this.prisma.user.findUnique({
      where: { email: invite.email },
    });

    if (!user) {
      const passwordHash = await bcrypt.hash(password, 12);
      user = await this.prisma.user.create({
        data: {
          email: invite.email,
          passwordHash,
          name,
          plan: "FREE",
          ...trialStartData(),
        },
      });
      this.mail.welcome(user);
    } else if (user.passwordHash) {
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        throw new UnauthorizedException("Password is incorrect");
      }
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await bcrypt.hash(password, 12) },
      });
    }

    await this.prisma.invite.update({
      where: { id: invite.id },
      data: {
        acceptedAt: invite.acceptedAt ?? new Date(),
        userId: user.id,
        name: name || invite.name,
      },
    });
    return user;
  }

  async listWaitlist(actorId: string) {
    await this.requireExempt(actorId);
    const items = await this.prisma.waitlist.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { items };
  }

  private async findInvite(token: string) {
    if (!isInviteToken(token)) {
      throw new NotFoundException("That invite link is not valid");
    }
    const invite = await this.prisma.invite.findUnique({ where: { token } });
    if (!invite) {
      throw new NotFoundException("That invite link is not valid");
    }
    return invite;
  }

  private async requireExempt(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { billingExempt: true },
    });
    if (!user?.billingExempt) {
      throw new ForbiddenException("Only the postN team can invite testers");
    }
  }

  private presentInvite(invite: {
    id: string;
    token: string;
    email: string;
    name: string | null;
    acceptedAt: Date | null;
    createdAt: Date;
  }) {
    const origin = (
      this.config.get<string>("FRONTEND_URL") ?? "http://localhost:3000"
    ).replace(/\/$/, "");
    return {
      id: invite.id,
      email: invite.email,
      name: invite.name,
      acceptedAt: invite.acceptedAt,
      createdAt: invite.createdAt,
      url: `${origin}/invite/${invite.token}`,
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
