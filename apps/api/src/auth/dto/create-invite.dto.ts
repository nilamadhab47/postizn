import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateInviteDto {
  @IsEmail()
  @MaxLength(160)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;
}
