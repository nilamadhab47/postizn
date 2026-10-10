import { Injectable } from "@nestjs/common";
import { Platform } from "@prisma/client";
import { mediaKind } from "@postn/shared";
import type { AuthResult, PublishInput } from "./base-provider";
import { TokenProvider, field, readJson } from "./token-provider";
import { itemsFromPublish } from "./fetch-media";
import { newsletterFrom, newsletterHtml } from "./newsletter-html";

const RESEND = "https://api.resend.com";

@Injectable()
export class NewsletterProvider extends TokenProvider {
  readonly platform = Platform.NEWSLETTER;
  readonly slug = "newsletter";
  readonly label = "Newsletter";
  readonly blurb = "Resend audience. Subject and preview stay with that list.";
  readonly tokenFields = [
    {
      name: "apiKey",
      label: "Resend API key",
      placeholder: "re_…",
      hint: "Resend → API Keys. Sends from your domain, not postN.",
      secret: true,
    },
    {
      name: "audienceId",
      label: "Audience ID",
      placeholder: "aud_…",
      hint: "Resend → Audiences. Unsubscribe lives there.",
    },
    {
      name: "fromEmail",
      label: "From email",
      placeholder: "hello@yourdomain.com",
      hint: "Must be on a domain you verified in Resend.",
    },
    {
      name: "fromName",
      label: "From name",
      placeholder: "Your brand",
    },
  ];

  async authenticateToken(fields: Record<string, string>): Promise<AuthResult> {
    const apiKey = field(fields, "apiKey");
    const audienceId = field(fields, "audienceId");
    const fromEmail = field(fields, "fromEmail").toLowerCase();
    const fromName = field(fields, "fromName");
    if (!apiKey || !audienceId || !fromEmail) {
      throw new Error("API key, audience ID, and from email are required");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
      throw new Error("From email does not look valid");
    }

    const res = await fetch(`${RESEND}/audiences/${encodeURIComponent(audienceId)}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });
    const json = (await readJson(res)) as {
      message?: string;
      name?: string;
      id?: string;
    };
    if (!res.ok || !json.id) {
      throw new Error(json.message ?? "Resend rejected that API key or audience");
    }

    return {
      platformId: json.id,
      username: fromEmail,
      displayName: fromName || json.name || fromEmail,
      accessToken: apiKey,
    };
  }

  async publishPost(input: PublishInput) {
    const items = itemsFromPublish(input);
    if (items.some((item) => mediaKind(item.mimeType) === "video")) {
      throw new Error("Newsletter does not take video");
    }
    const subject = String(input.settings?.subject ?? "").trim();
    if (!subject) {
      throw new Error("Add a subject on the Newsletter tab");
    }
    const fromEmail = (input.fromEmail ?? "").trim();
    if (!fromEmail.includes("@")) {
      throw new Error("Reconnect Newsletter with a from email");
    }
    const preview = String(input.settings?.preview ?? "").trim();
    const html = newsletterHtml(
      input.content,
      items.map((item) => ({ url: item.url, alt: item.alt })),
    );

    const created = await fetch(`${RESEND}/broadcasts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        audience_id: input.platformId,
        from: newsletterFrom(fromEmail, input.fromName),
        subject,
        html,
        ...(preview ? { preview_text: preview } : {}),
      }),
    });
    const createdJson = (await readJson(created)) as {
      id?: string;
      message?: string;
    };
    if (!created.ok || !createdJson.id) {
      throw new Error(createdJson.message ?? "Could not create the Resend broadcast");
    }

    const sent = await fetch(`${RESEND}/broadcasts/${createdJson.id}/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        Accept: "application/json",
      },
    });
    const sentJson = (await readJson(sent)) as { message?: string };
    if (!sent.ok) {
      throw new Error(sentJson.message ?? "Could not send the Resend broadcast");
    }

    return { platformPostId: createdJson.id };
  }
}
