/**
 * Parked with GoogleStrategy. Not registered in AuthModule.
 */
import {
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AuthService } from "./auth.service";

@Injectable()
export class GoogleAuthGuard extends AuthGuard("google") {
  constructor(private readonly auth: AuthService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (!this.auth.isGoogleConfigured()) {
      throw new ServiceUnavailableException(
        "Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to apps/api/.env",
      );
    }
    return super.canActivate(context);
  }
}
