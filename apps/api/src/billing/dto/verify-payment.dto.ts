import { IsOptional, IsString, MaxLength } from "class-validator";

export class VerifyPaymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  razorpay_order_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  razorpay_subscription_id?: string;

  @IsString()
  @MaxLength(80)
  razorpay_payment_id!: string;

  @IsString()
  @MaxLength(200)
  razorpay_signature!: string;
}
