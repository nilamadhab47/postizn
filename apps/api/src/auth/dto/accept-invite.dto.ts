import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class AcceptInviteDto {
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;
}
