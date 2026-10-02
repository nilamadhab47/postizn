import { Global, Module } from "@nestjs/common";
import { MailSweepWorker } from "../mail/mail-sweep.worker";
import { EntitlementsService } from "./entitlements.service";

@Global()
@Module({
  providers: [EntitlementsService, MailSweepWorker],
  exports: [EntitlementsService],
})
export class PlanModule {}
