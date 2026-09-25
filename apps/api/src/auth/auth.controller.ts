import { Body, Controller, Get, Post, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AuthService, SESSION_COOKIE } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { CurrentUser, type JwtUser } from "./current-user.decorator";

type CredentialsBody = {
  email?: string;
  password?: string;
  name?: string;
};

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  async register(
    @Body() body: CredentialsBody,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.auth.register({
      email: body.email ?? "",
      password: body.password ?? "",
      name: body.name,
    });
    this.setSession(res, user.id);
    return this.auth.getMe(user.id);
  }

  @Post("login")
  async login(
    @Body() body: CredentialsBody,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.auth.login({
      email: body.email ?? "",
      password: body.password ?? "",
    });
    this.setSession(res, user.id);
    return this.auth.getMe(user.id);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtUser) {
    return this.auth.getMe(user.userId);
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, this.auth.clearCookieOptions());
    return { ok: true };
  }

  private setSession(res: Response, userId: string) {
    res.cookie(SESSION_COOKIE, this.auth.signSession(userId), this.auth.cookieOptions());
  }
}
