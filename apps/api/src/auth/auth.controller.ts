import { Body, Controller, Get, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AuthService, SESSION_COOKIE } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { CurrentUser, type JwtUser } from "./current-user.decorator";
import { OauthLoginService } from "./oauth-login.service";
import type { LoginOauthProvider } from "./login-oauth-state.store";

type CredentialsBody = {
  email?: string;
  password?: string;
  name?: string;
};

type ProfileBody = {
  name?: string;
  timezone?: string;
  image?: string | null;
};

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly oauthLogin: OauthLoginService,
  ) {}

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

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  updateMe(@CurrentUser() user: JwtUser, @Body() body: ProfileBody) {
    return this.auth.updateProfile(user.userId, {
      name: body.name,
      timezone: body.timezone,
      image: body.image,
    });
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, this.auth.clearCookieOptions());
    return { ok: true };
  }

  @Get("providers")
  providers() {
    return this.oauthLogin.providers();
  }

  @Get("google")
  startGoogle(@Res() res: Response) {
    return res.redirect(this.oauthLogin.authorizeUrl("google"));
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
  startLinkedIn(@Res() res: Response) {
    return res.redirect(this.oauthLogin.authorizeUrl("linkedin"));
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
  startTwitter(@Res() res: Response) {
    return res.redirect(this.oauthLogin.authorizeUrl("twitter"));
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
    this.setSession(res, result.userId);
    return res.redirect(this.oauthLogin.successUrl());
  }

  private setSession(res: Response, userId: string) {
    res.cookie(SESSION_COOKIE, this.auth.signSession(userId), this.auth.cookieOptions());
  }
}
