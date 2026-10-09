import {
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UploadDataUrlDto {
  @IsString()
  @MaxLength(20_000_000)
  dataUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  fileName?: string;
}

export class DeriveMediaDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  aspect?: string;

  @IsOptional()
  @IsNumber()
  zoom?: number;

  @IsOptional()
  @IsNumber()
  rotation?: number;

  @IsOptional()
  @IsBoolean()
  flipX?: boolean;

  @IsOptional()
  @IsBoolean()
  flipY?: boolean;

  @IsOptional()
  @IsObject()
  crop?: { x: number; y: number; width: number; height: number };
}
