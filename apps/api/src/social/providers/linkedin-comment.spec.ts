import { describe, expect, it } from "vitest";
import {
  cleanChannelSettings,
  firstCommentPending,
  MAX_FIRST_COMMENT,
} from "@postn/shared";
import { linkedInCommentBody, linkedInCommentUrl } from "./linkedin-comment";

describe("linkedin first comment", () => {
  it("encodes the parent URN in the comments path", () => {
    const urn = "urn:li:share:123";
    expect(linkedInCommentUrl(urn)).toBe(
      "https://api.linkedin.com/rest/socialActions/urn%3Ali%3Ashare%3A123/comments",
    );
  });

  it("posts as the same actor on the parent URN", () => {
    expect(
      linkedInCommentBody("urn:li:person:abc", "urn:li:share:123", "link in comments"),
    ).toEqual({
      actor: "urn:li:person:abc",
      object: "urn:li:share:123",
      message: { text: "link in comments" },
    });
  });
});

describe("firstComment settings", () => {
  it("keeps trimmed LinkedIn first comment and drops empty", () => {
    expect(
      cleanChannelSettings("LINKEDIN", { firstComment: "  hello  " }).firstComment,
    ).toBe("hello");
    expect(cleanChannelSettings("LINKEDIN", { firstComment: "   " })).toEqual({});
    expect(cleanChannelSettings("TWITTER", { firstComment: "nope" })).toEqual({});
  });

  it("caps comment length", () => {
    const long = "x".repeat(MAX_FIRST_COMMENT + 40);
    expect(
      cleanChannelSettings("LINKEDIN_PAGE", { firstComment: long }).firstComment?.length,
    ).toBe(MAX_FIRST_COMMENT);
  });

  it("is pending until a comment id is stored", () => {
    expect(firstCommentPending({ firstComment: "cta" })).toBe(true);
    expect(
      firstCommentPending({ firstComment: "cta", firstCommentId: "urn:li:comment:1" }),
    ).toBe(false);
    expect(firstCommentPending({})).toBe(false);
  });

  it("keeps newsletter subject and preview", () => {
    expect(
      cleanChannelSettings("NEWSLETTER", {
        subject: "  Launch  ",
        preview: "  teaser  ",
        firstComment: "ignored",
      }),
    ).toEqual({ subject: "Launch", preview: "teaser" });
  });

  it("does not treat client comment ids as a reason to skip sanitizing text", () => {
    const cleaned = cleanChannelSettings("LINKEDIN", {
      firstComment: "  go  ",
      firstCommentId: "urn:li:comment:9",
      layout: "carousel",
    });
    expect(cleaned).toEqual({
      layout: "carousel",
      firstComment: "go",
      firstCommentId: "urn:li:comment:9",
    });
  });
});
