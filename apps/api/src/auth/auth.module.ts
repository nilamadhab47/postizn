import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { OauthLoginService } from "./oauth-login.service";
import { LoginOauthStateStore } from "./login-oauth-state.store";
import { jwtSecretFrom } from "../config/secrets";

@Module({
  imports: [
    PassportModule.register({ session: false }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: jwtSecretFrom(config),
        signOptions: { expiresIn: "7d" },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, OauthLoginService, LoginOauthStateStore],
  exports: [AuthService, JwtStrategy],
})
export class AuthModule {}
