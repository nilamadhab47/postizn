import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, type Profile, type VerifyCallback } from "passport-google-oauth20";
import { AuthService } from "./auth.service";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(
    config: ConfigService,
    private readonly auth: AuthService,
  ) {
    const clientID = config.get<string>("GOOGLE_CLIENT_ID") || "not-configured";
    const clientSecret =
      config.get<string>("GOOGLE_CLIENT_SECRET") || "not-configured";
    super({
      clientID,
      clientSecret,
      callbackURL:
        config.get<string>("GOOGLE_CALLBACK_URL") ??
        "http://localhost:4000/auth/google/callback",
      scope: ["email", "profile"],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error("Google profile did not include an email"));
      return;
    }

    const user = await this.auth.upsertGoogleUser({
      googleId: profile.id,
      email,
      name: profile.displayName,
      image: profile.photos?.[0]?.value,
      emailVerified: Boolean(profile.emails?.[0]?.verified),
    });

    done(null, { id: user.id });
  }
}
