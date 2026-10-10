import { IsString, MaxLength, MinLength } from "class-validator";

export class RedeemPromoDto {
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  code!: string;
}
