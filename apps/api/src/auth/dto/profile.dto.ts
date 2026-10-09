import { IsIn, IsOptional, IsString, MaxLength, ValidateIf } from "class-validator";
import { ALLOWED_TIMEZONES } from "../auth.service";

export class ProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsIn(ALLOWED_TIMEZONES)
  timezone?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(500)
  image?: string | null;
}
