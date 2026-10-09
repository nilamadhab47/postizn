import { describe, expect, it } from "vitest";
import { assertAllowedUploadMime, sniffUploadMime } from "./sniff-upload";

describe("sniffUploadMime", () => {
  it("detects JPEG magic bytes", () => {
    expect(sniffUploadMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(
      "image/jpeg",
    );
  });

  it("rejects SVG labelled as an image", () => {
    expect(sniffUploadMime(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'>"))).toBe(
      null,
    );
    expect(() => assertAllowedUploadMime(null)).toThrow(/JPEG/);
  });

  it("rejects HTML", () => {
    expect(sniffUploadMime(Buffer.from("<!doctype html><script>alert(1)</script>"))).toBe(
      null,
    );
  });
});
