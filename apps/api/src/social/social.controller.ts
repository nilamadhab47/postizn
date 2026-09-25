import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, type JwtUser } from "../auth/current-user.decorator";
import { SocialService } from "./social.service";

@Controller("social")
export class SocialController {
  constructor(private readonly social: SocialService) {}

  @Get("channels")
  @UseGuards(JwtAuthGuard)
  channels(@CurrentUser() user: JwtUser) {
    return this.social.catalog(user.userId);
  }

  @Get("connect/:platform")
  @UseGuards(JwtAuthGuard)
  async connect(
    @CurrentUser() user: JwtUser,
    @Param("platform") platform: string,
    @Res() res: Response,
  ) {
    const result = await this.social.startConnect(user.userId, platform);
    return res.redirect(result.url);
  }

  @Post("connect/:platform/token")
  @UseGuards(JwtAuthGuard)
  connectToken(
    @CurrentUser() user: JwtUser,
    @Param("platform") platform: string,
    @Body() body: { fields?: Record<string, string> },
  ) {
    return this.social.connectToken(user.userId, platform, body.fields ?? {});
  }

  @Get("callback/:platform")
  async callback(
    @Param("platform") platform: string,
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Query("error") error: string | undefined,
    @Res() res: Response,
  ) {
    if (error) {
      const status =
        error === "unauthorized_scope_error" || error === "invalid_scope"
          ? "scope_denied"
          : "denied";
      return res.redirect(this.social.accountsRedirect(status, platform));
    }
    const url = await this.social.handleCallback(platform, code, state);
    return res.redirect(url);
  }

  @Post("accounts/:id/test")
  @UseGuards(JwtAuthGuard)
  testPublish(
    @CurrentUser() user: JwtUser,
    @Param("id") id: string,
    @Body() body: { content?: string },
  ) {
    return this.social.testPublish(user.userId, id, body.content);
  }

  @Delete("accounts/:id")
  @UseGuards(JwtAuthGuard)
  disconnect(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.social.disconnect(user.userId, id);
  }
}
