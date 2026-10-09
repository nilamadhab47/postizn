import { describe, expect, it } from "vitest";
import { corsOrigins } from "./cors-origins";

describe("corsOrigins", () => {
  it("adds the www sibling of the primary origin", () => {
    const origins = corsOrigins({ FRONTEND_URL: "https://www.postind.xyz" });
    expect(origins).toContain("https://www.postind.xyz");
    expect(origins).toContain("https://postind.xyz");
  });

  it("keeps localhost as-is", () => {
    expect(corsOrigins({ FRONTEND_URL: "http://localhost:3000" })).toEqual([
      "http://localhost:3000",
    ]);
  });
});
