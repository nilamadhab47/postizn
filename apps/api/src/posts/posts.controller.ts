import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, type JwtUser } from "../auth/current-user.decorator";
import { PostsService, type CreatePostInput } from "./posts.service";
import { SavePostDto } from "./dto/save-post.dto";
import { RetryPostDto } from "./dto/retry-post.dto";

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
  create(@CurrentUser() user: JwtUser, @Body() body: SavePostDto) {
    return this.posts.create(user.userId, body as CreatePostInput);
  }

  @Post(":id/retry")
  retry(
    @CurrentUser() user: JwtUser,
    @Param("id") id: string,
    @Body() body: RetryPostDto,
  ) {
    return this.posts.retry(user.userId, id, body.platform);
  }

  @Post(":id/cancel")
  cancel(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.posts.cancel(user.userId, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: JwtUser,
    @Param("id") id: string,
    @Body() body: SavePostDto,
  ) {
    return this.posts.update(user.userId, id, body as CreatePostInput);
  }

  @Delete(":id")
  remove(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.posts.remove(user.userId, id);
  }
}
