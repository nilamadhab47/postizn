import { BadRequestException, Body, Controller, Get, Headers, HttpCode, Post, Req, UseGuards } from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser, type JwtUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { BillingService } from "./billing.service";
import { CheckoutDto } from "./dto/checkout.dto";
import { VerifyPaymentDto } from "./dto/verify-payment.dto";

@Controller("billing")
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get("catalog")
  catalog() {
    return this.billing.catalog();
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtUser) {
    return this.billing.status(user.userId);
  }

  @Post("checkout")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  checkout(@CurrentUser() user: JwtUser, @Body() body: CheckoutDto) {
    return this.billing.createCheckout(user.userId, body.plan, body.interval);
  }

  @Post("verify")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  verify(@CurrentUser() user: JwtUser, @Body() body: VerifyPaymentDto) {
    return this.billing.verifyPayment(user.userId, body);
  }

  /** Provider-facing. Signature check lives in the PaymentProvider adapter. */
  @Post("webhook")
  @HttpCode(200)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const raw = req.rawBody;
    if (!raw?.length) {
      throw new BadRequestException("Missing raw body");
    }
    return this.billing.handleWebhook(raw, headers);
  }
}
