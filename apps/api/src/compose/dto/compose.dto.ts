import { IsOptional, IsString, MaxLength } from "class-validator";

export class ComposeDraftDto {
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  draft?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  topic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  kind?: string;
}

export class ComposeImageDto {
  @IsString()
  @MaxLength(2000)
  prompt!: string;
}
