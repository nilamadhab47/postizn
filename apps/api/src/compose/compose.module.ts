import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ComposeController } from "./compose.controller";
import { ComposeService } from "./compose.service";

@Module({
  imports: [AuthModule],
  controllers: [ComposeController],
  providers: [ComposeService],
})
export class ComposeModule {}
