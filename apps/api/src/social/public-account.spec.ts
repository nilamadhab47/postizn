import { Platform } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { publicAccount } from "./public-account";

describe("publicAccount", () => {
  it("does not include access or refresh tokens", () => {
    const view = publicAccount({
      id: "acc_1",
      platform: Platform.LINKEDIN,
      platformId: "urn:li:person:1",
      username: "founder",
      displayName: "Founder",
      avatar: null,
      isActive: true,
      accessToken: "enc:v1:should-never-leak",
      refreshToken: "enc:v1:refresh",
    });
    expect(view).not.toHaveProperty("accessToken");
    expect(view).not.toHaveProperty("refreshToken");
    expect(JSON.stringify(view)).not.toContain("enc:v1");
  });
});
