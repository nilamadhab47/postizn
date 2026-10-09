import { describe, expect, it } from "vitest";
import { oauthLinkDecision } from "./oauth-link";

const unverifiedPassword = {
  passwordHash: "hash",
  emailVerified: null,
  googleId: null,
  linkedinId: null,
  twitterId: null,
};

describe("oauthLinkDecision", () => {
  it("does not merge an unverified password signup with unverified OAuth", () => {
    const decision = oauthLinkDecision(unverifiedPassword, {
      provider: "google",
      providerId: "g-1",
      emailVerified: false,
    });
    expect(decision.action).toBe("conflict");
  });

  it("lets verified OAuth take over an unverified password signup", () => {
    const decision = oauthLinkDecision(unverifiedPassword, {
      provider: "google",
      providerId: "g-1",
      emailVerified: true,
    });
    expect(decision).toEqual({ action: "takeover-unverified" });
  });

  it("links OAuth onto a verified password account", () => {
    const decision = oauthLinkDecision(
      { ...unverifiedPassword, emailVerified: new Date("2026-01-01") },
      { provider: "google", providerId: "g-1", emailVerified: true },
    );
    expect(decision).toEqual({ action: "update" });
  });

  it("rejects a different Google id on the same user", () => {
    const decision = oauthLinkDecision(
      { ...unverifiedPassword, googleId: "g-old" },
      { provider: "google", providerId: "g-new", emailVerified: true },
    );
    expect(decision.action).toBe("conflict");
  });
});
