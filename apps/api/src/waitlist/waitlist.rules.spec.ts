import { describe, expect, it } from "vitest";
import { parseWaitlistJoin } from "./waitlist.rules";

describe("parseWaitlistJoin", () => {
  it("accepts a normal email and lowercases it", () => {
    expect(parseWaitlistJoin({ email: "  Founder@Brand.in " })).toEqual({
      kind: "ok",
      email: "founder@brand.in",
    });
  });

  it("treats a filled company field as a bot", () => {
    expect(parseWaitlistJoin({ email: "a@b.co", company: "Acme" })).toEqual({
      kind: "honeypot",
    });
  });

  it("rejects empty or malformed emails", () => {
    expect(parseWaitlistJoin({ email: "" }).kind).toBe("invalid");
    expect(parseWaitlistJoin({ email: "not-an-email" }).kind).toBe("invalid");
    expect(parseWaitlistJoin({ email: "a@b." }).kind).toBe("invalid");
  });
});
