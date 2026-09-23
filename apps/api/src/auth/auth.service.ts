import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";

export type GoogleProfile = {
  googleId: string;
  email: string;
  name?: string;
  image?: string;
  emailVerified?: boolean;
};

export const SESSION_COOKIE = "postn_session";

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

    return user;
  }
}
