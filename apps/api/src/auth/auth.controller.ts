import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { ConfigService } from "@nestjs/config";
import { AuthService, SESSION_COOKIE } from "./auth.service";
import { GoogleAuthGuard } from "./google-auth.guard";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { CurrentUser, type JwtUser } from "./current-user.decorator";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Get("google")
  @UseGuards(GoogleAuthGuard)
  googleStart() {
    return;
  }

  @Get("google/callback")
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @Req() req: Request & { user: { id: string } },
    @Res() res: Response,
  ) {
    const token = this.auth.signSession(req.user.id);
    res.cookie(SESSION_COOKIE, token, this.auth.cookieOptions());
    const frontend = this.config.get<string>("FRONTEND_URL") ?? "http://localhost:3000";
    return res.redirect(`${frontend}/dashboard`);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtUser) {
    return this.auth.getMe(user.userId);
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    return { ok: true };
  }
}
