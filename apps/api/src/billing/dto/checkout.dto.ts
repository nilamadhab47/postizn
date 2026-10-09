import { IsIn, IsString } from "class-validator";

export class CheckoutDto {
  @IsString()
  @IsIn(["PRO", "STUDIO"])
  plan!: string;

  @IsString()
  @IsIn(["monthly", "yearly"])
  interval!: string;
}
