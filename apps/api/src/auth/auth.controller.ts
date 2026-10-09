import { Body, Controller, Get, Patch, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { Throttle } from "@nestjs/throttler";
import { SESSION_COOKIE } from "./auth.constants";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { CurrentUser, type JwtUser } from "./current-user.decorator";
import { OauthLoginService } from "./oauth-login.service";
import type { LoginOauthProvider } from "./login-oauth-state.store";
import { CredentialsDto } from "./dto/credentials.dto";
import { ProfileDto } from "./dto/profile.dto";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly oauthLogin: OauthLoginService,
  ) {}

  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(
    @Body() body: CredentialsDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.auth.register({
      email: body.email,
      password: body.password,
      name: body.name,
    });
    await this.setSession(res, user.id);
    return this.auth.getMe(user.id);
  }

  @Post("login")
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  async login(
    @Body() body: CredentialsDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.auth.login({
      email: body.email,
      password: body.password,
    });
    await this.setSession(res, user.id);
    return this.auth.getMe(user.id);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtUser) {
    return this.auth.getMe(user.userId);
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  updateMe(@CurrentUser() user: JwtUser, @Body() body: ProfileDto) {
    return this.auth.updateProfile(user.userId, {
      name: body.name,
      timezone: body.timezone,
      image: body.image,
    });
  }

  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.revokeSessionFromRequest(req);
    res.clearCookie(SESSION_COOKIE, this.auth.clearCookieOptions());
    return { ok: true };
  }

  @Get("providers")
  providers() {
    return this.oauthLogin.providers();
  }

  @Get("google")
  async startGoogle(@Res() res: Response) {
    return res.redirect(await this.oauthLogin.authorizeUrl("google"));
  }

  @Get("google/callback")
  googleCallback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Query("error") error: string | undefined,
    @Res() res: Response,
  ) {
    return this.finishOauth(res, "google", { code, state, error });
  }

  @Get("linkedin")
  async startLinkedIn(@Res() res: Response) {
    return res.redirect(await this.oauthLogin.authorizeUrl("linkedin"));
  }

  @Get("linkedin/callback")
  linkedInCallback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Query("error") error: string | undefined,
    @Res() res: Response,
  ) {
    return this.finishOauth(res, "linkedin", { code, state, error });
  }

  @Get("twitter")
  async startTwitter(@Res() res: Response) {
    return res.redirect(await this.oauthLogin.authorizeUrl("twitter"));
  }

  @Get("twitter/callback")
  twitterCallback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Query("error") error: string | undefined,
    @Res() res: Response,
  ) {
    return this.finishOauth(res, "twitter", { code, state, error });
  }

  private async finishOauth(
    res: Response,
    provider: LoginOauthProvider,
    query: { code?: string; state?: string; error?: string },
  ) {
    const result = await this.oauthLogin.finish(provider, query);
    if (result.kind === "error") {
      return res.redirect(result.url);
    }
    await this.setSession(res, result.userId);
    return res.redirect(this.oauthLogin.successUrl());
  }

  private async setSession(res: Response, userId: string) {
    res.cookie(
      SESSION_COOKIE,
      await this.auth.signSession(userId),
      this.auth.cookieOptions(),
    );
  }
}
