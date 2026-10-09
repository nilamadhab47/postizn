import { IsArray, IsObject, IsOptional, IsString, MaxLength, ValidateIf } from "class-validator";

export class SavePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  action?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  content?: string;

  @IsOptional()
  @IsObject()
  contentByPlatform?: Record<string, string>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  platforms?: string[];

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  scheduledAt?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];

  @IsOptional()
  @IsObject()
  mediaByPlatform?: Record<string, string[]>;

  @IsOptional()
  @IsObject()
  mediaAlt?: Record<string, string>;

  @IsOptional()
  @IsObject()
  settingsByPlatform?: Record<string, Record<string, unknown>>;
}
