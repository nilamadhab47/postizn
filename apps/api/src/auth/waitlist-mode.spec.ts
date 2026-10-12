import { describe, expect, it } from "vitest";
import { isWaitlistMode } from "./waitlist-mode";

function config(env: Record<string, string | undefined>) {
  return { get: (key: string) => env[key] };
}

describe("isWaitlistMode", () => {
  it("defaults to on in production", () => {
    expect(isWaitlistMode(config({ NODE_ENV: "production" }))).toBe(true);
  });

  it("defaults to off outside production", () => {
    expect(isWaitlistMode(config({ NODE_ENV: "development" }))).toBe(false);
  });

  it("honours WAITLIST_MODE over NODE_ENV", () => {
    expect(
      isWaitlistMode(config({ NODE_ENV: "production", WAITLIST_MODE: "false" })),
    ).toBe(false);
    expect(
      isWaitlistMode(config({ NODE_ENV: "development", WAITLIST_MODE: "true" })),
    ).toBe(true);
  });
});
