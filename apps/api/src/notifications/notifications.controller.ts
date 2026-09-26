import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, type JwtUser } from "../auth/current-user.decorator";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: JwtUser) {
    return this.notifications.list(user.userId);
  }

  @Get("unread-count")
  unread(@CurrentUser() user: JwtUser) {
    return this.notifications.unreadCount(user.userId);
  }

  @Post("read-all")
  readAll(@CurrentUser() user: JwtUser) {
    return this.notifications.markAllRead(user.userId);
  }

  @Post(":id/read")
  readOne(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.notifications.markRead(user.userId, id);
  }
}
