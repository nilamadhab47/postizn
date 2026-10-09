import { IsOptional, IsString, MaxLength } from "class-validator";

export class RetryPostDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  platform?: string;
}
