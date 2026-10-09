export type OauthProvider = "google" | "linkedin" | "twitter";

export type OauthLinkProfile = {
  provider: OauthProvider;
  providerId: string;
  emailVerified?: boolean;
};

export type OauthLinkAccount = {
  passwordHash: string | null;
  emailVerified: Date | null;
  googleId: string | null;
  linkedinId: string | null;
  twitterId: string | null;
};

export type OauthLinkDecision =
  | { action: "conflict"; message: string }
  | { action: "takeover-unverified" }
  | { action: "update" };

export function linkedOauthId(account: OauthLinkAccount, provider: OauthProvider) {
  if (provider === "google") return account.googleId;
  if (provider === "linkedin") return account.linkedinId;
  return account.twitterId;
}

export function oauthLinkDecision(
  existing: OauthLinkAccount,
  profile: OauthLinkProfile,
): OauthLinkDecision {
  const alreadyLinked = linkedOauthId(existing, profile.provider);
  if (alreadyLinked && alreadyLinked !== profile.providerId) {
    return {
      action: "conflict",
      message: "This email is already linked to a different account",
    };
  }
  if (!alreadyLinked && existing.passwordHash && !existing.emailVerified) {
    if (!profile.emailVerified) {
      return {
        action: "conflict",
        message: "This email already has an account. Sign in with your password.",
      };
    }
    return { action: "takeover-unverified" };
  }
  return { action: "update" };
}
