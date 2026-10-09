import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CredentialsDto {
  @IsEmail()
  @MaxLength(160)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;
}
