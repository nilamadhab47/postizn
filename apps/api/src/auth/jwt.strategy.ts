import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Request } from "express";
import { jwtSecretFrom } from "../config/secrets";
import { PrismaService } from "../prisma/prisma.service";
import { SESSION_COOKIE } from "./auth.constants";

type JwtPayload = { sub: string; sv?: number };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.[SESSION_COOKIE] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecretFrom(config),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub) throw new UnauthorizedException();
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, sessionVersion: true },
    });
    if (!user || user.sessionVersion !== (payload.sv ?? 0)) {
      throw new UnauthorizedException();
    }
    return { userId: user.id };
  }
}
