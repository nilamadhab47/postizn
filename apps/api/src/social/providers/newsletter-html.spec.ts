import { describe, expect, it } from "vitest";
import { newsletterFrom, newsletterHtml } from "./newsletter-html";

describe("newsletter html", () => {
  it("escapes body text and keeps paragraphs", () => {
    expect(newsletterHtml("Hello <b>there</b>\n\nNext")).toBe(
      "<div><p>Hello &lt;b&gt;there&lt;/b&gt;</p><p>Next</p></div>",
    );
  });

  it("appends images after the body", () => {
    expect(newsletterHtml("Hi", [{ url: "https://cdn.example/a.jpg", alt: "A" }])).toContain(
      '<img src="https://cdn.example/a.jpg" alt="A" />',
    );
  });

  it("formats from as name + email", () => {
    expect(newsletterFrom("hi@brand.com", "Brand")).toBe("Brand <hi@brand.com>");
    expect(newsletterFrom("hi@brand.com")).toBe("hi@brand.com");
  });
});
