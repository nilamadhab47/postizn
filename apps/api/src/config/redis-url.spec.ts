import { describe, expect, it } from "vitest";
import { assertRedisUrl } from "./redis-url";

describe("assertRedisUrl", () => {
  it("accepts local redis without a password", () => {
    expect(assertRedisUrl("redis://localhost:6381", "development")).toBe(
      "redis://localhost:6381",
    );
  });

  it("requires a password in production", () => {
    expect(() => assertRedisUrl("redis://localhost:6379", "production")).toThrow(
      /password/,
    );
  });

  it("accepts a production URL with AUTH", () => {
    expect(
      assertRedisUrl("rediss://:secretpass@redis.example:6379", "production"),
    ).toContain("redis.example");
  });
});
