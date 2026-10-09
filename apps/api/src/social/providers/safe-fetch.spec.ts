import { describe, expect, it } from "vitest";
import { assertSafeMediaUrl, hostAllowed, isPrivateIp } from "./safe-fetch";

describe("safe-fetch", () => {
  it("flags loopback and RFC1918 addresses", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("10.0.0.4")).toBe(true);
    expect(isPrivateIp("192.168.1.9")).toBe(true);
    expect(isPrivateIp("169.254.169.254")).toBe(true);
    expect(isPrivateIp("::1")).toBe(true);
  });

  it("only allows the R2 public host", () => {
    expect(hostAllowed("pub-abc.r2.dev", ["pub-abc.r2.dev"])).toBe(true);
    expect(hostAllowed("evil.example", ["pub-abc.r2.dev"])).toBe(false);
  });

  it("rejects localhost even if someone allowlists it", async () => {
    await expect(
      assertSafeMediaUrl("http://127.0.0.1/secret", ["127.0.0.1"]),
    ).rejects.toThrow(/not allowed/);
  });

  it("rejects a host that is not on the allowlist", async () => {
    await expect(
      assertSafeMediaUrl("https://example.com/pic.jpg", ["pub-abc.r2.dev"]),
    ).rejects.toThrow(/not allowed/);
  });
});
