import { describe, expect, it } from "vitest";
import { parseLoginOauth } from "./login-oauth-state.store";
import { parseSocialOauth } from "../social/oauth-state.store";

describe("oauth state payloads", () => {
  it("parses a login state once", () => {
    expect(
      parseLoginOauth(JSON.stringify({ provider: "google", codeVerifier: "abc" })),
    ).toEqual({ provider: "google", codeVerifier: "abc" });
  });

  it("rejects junk", () => {
    expect(parseLoginOauth("not-json")).toBeNull();
    expect(parseSocialOauth(null)).toBeNull();
  });
});
