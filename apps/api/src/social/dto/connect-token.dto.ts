import { IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class ConnectTokenDto {
  @IsOptional()
  @IsObject()
  fields?: Record<string, string>;
}

export class TestPublishDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;
}
