import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, type JwtUser } from "../auth/current-user.decorator";
import { ComposeService } from "./compose.service";
import { ComposeDraftDto, ComposeImageDto } from "./dto/compose.dto";

@Controller("compose")
@UseGuards(JwtAuthGuard)
export class ComposeController {
  constructor(private readonly compose: ComposeService) {}

  @Get("ai")
  status(@CurrentUser() user: JwtUser) {
    return this.compose.imageStatus(user.userId);
  }

  @Post("variations")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async variations(@CurrentUser() user: JwtUser, @Body() body: ComposeDraftDto) {
    return this.compose.variations(user.userId, body.draft ?? "", body.topic);
  }

  @Post("suggest")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async suggest(@CurrentUser() user: JwtUser, @Body() body: ComposeDraftDto) {
    return this.compose.suggest(user.userId, body.draft ?? "", body.kind ?? "india");
  }

  @Post("image")
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  image(@CurrentUser() user: JwtUser, @Body() body: ComposeImageDto) {
    return this.compose.generateImage(user.userId, body.prompt);
  }
}
