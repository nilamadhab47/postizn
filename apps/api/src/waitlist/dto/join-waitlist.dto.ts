import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

export class JoinWaitlistDto {
  @IsEmail()
  @MaxLength(160)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;
}
