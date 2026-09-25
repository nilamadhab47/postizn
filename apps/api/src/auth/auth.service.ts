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
import { entitlements } from "../plan/entitlements";

export type GoogleProfile = {
  googleId: string;
  email: string;
  name?: string;
  image?: string;
  emailVerified?: boolean;
};

export const SESSION_COOKIE = "postn_session";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    return this.prisma.user.create({
      data: { email, passwordHash, name, plan: "FREE" },
    });
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

  /** Parked — Google login is not exposed. Kept for when OAuth returns. */
  async upsertGoogleUser(profile: GoogleProfile) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId: profile.googleId }, { email: profile.email }],
      },
    });

    if (existing) {
      return this.prisma.user.update({
        where: { id: existing.id },
        data: {
          googleId: profile.googleId,
          name: profile.name ?? existing.name,
          image: profile.image ?? existing.image,
          emailVerified: profile.emailVerified
            ? new Date()
            : existing.emailVerified,
        },
      });
    }

    return this.prisma.user.create({
      data: {
        email: profile.email,
        googleId: profile.googleId,
        name: profile.name,
        image: profile.image,
        emailVerified: profile.emailVerified ? new Date() : null,
      },
    });
  }

  signSession(userId: string) {
    return this.jwt.sign({ sub: userId });
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        plan: true,
        timezone: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return { ...user, entitlements: entitlements(user.plan) };
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
}
