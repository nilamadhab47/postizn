import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, type JwtUser } from "../auth/current-user.decorator";
import { ComposeService } from "./compose.service";

@Controller("compose")
@UseGuards(JwtAuthGuard)
export class ComposeController {
  constructor(private readonly compose: ComposeService) {}

  @Get("ai")
  async status(@CurrentUser() user: JwtUser) {
    const plan = await this.compose.planOf(user.userId);
    return this.compose.imageStatus(user.userId, plan);
  }

  @Post("variations")
  async variations(
    @CurrentUser() user: JwtUser,
    @Body() body: { draft?: string; topic?: string },
  ) {
    return this.compose.variations(user.userId, body.draft ?? "", body.topic);
  }

  @Post("suggest")
  async suggest(
    @CurrentUser() user: JwtUser,
    @Body() body: { draft?: string; kind?: string },
  ) {
    return this.compose.suggest(user.userId, body.draft ?? "", body.kind ?? "india");
  }

  @Post("image")
  async image(
    @CurrentUser() user: JwtUser,
    @Body() body: { prompt?: string },
  ) {
    const plan = await this.compose.planOf(user.userId);
    return this.compose.generateImage(user.userId, body.prompt ?? "", plan);
  }
}
