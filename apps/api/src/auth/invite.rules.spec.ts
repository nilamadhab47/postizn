import { describe, expect, it } from "vitest";
import { isInviteToken, newInviteToken } from "./invite.rules";

describe("invite tokens", () => {
  it("mints url-safe tokens that pass the public check", () => {
    const token = newInviteToken();
    expect(isInviteToken(token)).toBe(true);
    expect(token).not.toMatch(/[+/=]/);
  });

  it("rejects empty or odd strings", () => {
    expect(isInviteToken("")).toBe(false);
    expect(isInviteToken("short")).toBe(false);
    expect(isInviteToken("../etc/passwd")).toBe(false);
  });
});
