import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { createPaymentProvider, PAYMENT_PROVIDER } from "./payment-provider.factory";

@Module({
  controllers: [BillingController],
  providers: [
    {
      provide: PAYMENT_PROVIDER,
      inject: [ConfigService],
      useFactory: createPaymentProvider,
    },
    BillingService,
  ],
  exports: [BillingService],
})
export class BillingModule {}
