import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, type JwtUser } from "../auth/current-user.decorator";
import { MediaService, UPLOAD_MAX_BYTES } from "./media.service";

@Controller("media")
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  list(@CurrentUser() user: JwtUser) {
    return this.media.list(user.userId);
  }

  /** Bytes for canvas crop. Avoids R2 CORS tainting in the browser. */
  @Get("file")
  @Header("Cache-Control", "private, max-age=120")
  async file(
    @CurrentUser() user: JwtUser,
    @Query("url") url: string,
  ) {
    if (!url?.trim()) {
      throw new BadRequestException("Missing file url");
    }
    const { body, mimeType } = await this.media.loadOwned(user.userId, url.trim());
    return new StreamableFile(body, { type: mimeType, disposition: "inline" });
  }

  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: UPLOAD_MAX_BYTES },
    }),
  )
  upload(
    @CurrentUser() user: JwtUser,
    @UploadedFile()
    file?: { buffer: Buffer; mimetype: string; originalname: string; size: number },
  ) {
    if (!file?.buffer) {
      throw new BadRequestException("Choose a photo, GIF, or MP4");
    }
    return this.media.uploadFile(user.userId, file);
  }

  @Post("data")
  fromData(
    @CurrentUser() user: JwtUser,
    @Body() body: { dataUrl?: string; fileName?: string },
  ) {
    return this.media.uploadDataUrl(user.userId, body.dataUrl ?? "", body.fileName);
  }

  @Post("derive")
  derive(
    @CurrentUser() user: JwtUser,
    @Body() body: Record<string, unknown>,
  ) {
    const id = typeof body.id === "string" ? body.id : undefined;
    const url = typeof body.url === "string" ? body.url : undefined;
    return this.media.derive(user.userId, { id, url }, body);
  }

  @Post(":id/derive")
  deriveById(
    @CurrentUser() user: JwtUser,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.media.derive(user.userId, { id }, body);
  }

  @Delete(":id")
  remove(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.media.remove(user.userId, id);
  }
}
