import { describe, expect, it } from "vitest";
import { assertAppSecrets, assertUsableSecret } from "./secrets";

const JWT = "a".repeat(32);
const TOKEN = "b".repeat(32);

describe("assertAppSecrets", () => {
  it("accepts two different long secrets", () => {
    expect(assertAppSecrets({ JWT_SECRET: JWT, TOKEN_ENCRYPTION_KEY: TOKEN })).toEqual({
      jwt: JWT,
      token: TOKEN,
    });
  });

  it("rejects the hardcoded JWT fallback", () => {
    expect(() => assertUsableSecret("JWT_SECRET", "dev-only-change-me")).toThrow(
      /placeholder/,
    );
  });

  it("rejects a short secret", () => {
    expect(() => assertUsableSecret("JWT_SECRET", "tooshort")).toThrow(/32/);
  });

  it("rejects a missing token encryption key", () => {
    expect(() =>
      assertAppSecrets({ JWT_SECRET: JWT, TOKEN_ENCRYPTION_KEY: "" }),
    ).toThrow(/TOKEN_ENCRYPTION_KEY/);
  });

  it("rejects using JWT_SECRET as TOKEN_ENCRYPTION_KEY", () => {
    expect(() =>
      assertAppSecrets({ JWT_SECRET: JWT, TOKEN_ENCRYPTION_KEY: JWT }),
    ).toThrow(/different/);
  });
});
