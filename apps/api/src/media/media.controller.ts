import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, type JwtUser } from "../auth/current-user.decorator";
import { MediaService } from "./media.service";

@Controller("media")
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  list(@CurrentUser() user: JwtUser) {
    return this.media.list(user.userId);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  upload(
    @CurrentUser() user: JwtUser,
    @UploadedFile()
    file?: { buffer: Buffer; mimetype: string; originalname: string; size: number },
  ) {
    if (!file?.buffer) {
      throw new BadRequestException("Choose an image");
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

  @Delete(":id")
  remove(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.media.remove(user.userId, id);
  }
}
