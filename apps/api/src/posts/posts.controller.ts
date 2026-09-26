import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, type JwtUser } from "../auth/current-user.decorator";
import { PostsService, type CreatePostInput } from "./posts.service";

@Controller("posts")
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get()
  list(@CurrentUser() user: JwtUser, @Query("status") status?: string) {
    return this.posts.list(user.userId, status);
  }

  @Get(":id")
  get(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.posts.get(user.userId, id);
  }

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() body: CreatePostInput) {
    return this.posts.create(user.userId, body);
  }
}
