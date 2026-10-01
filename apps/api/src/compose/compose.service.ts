import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EntitlementsService } from "../plan/entitlements.service";

type GeminiInline = {
  data?: string;
  mimeType?: string;
  mime_type?: string;
};

type GeminiImageJson = {
  error?: { message?: string };
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: GeminiInline;
        inline_data?: GeminiInline;
      }>;
    };
  }>;
  output_image?: GeminiInline;
  outputImage?: GeminiInline;
};

@Injectable()
export class ComposeService {
  constructor(
    private readonly config: ConfigService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async variations(userId: string, draft: string, topic?: string) {
    await this.entitlements.assertAi(userId);
    const seed = (topic?.trim() || draft.trim() || "D2C drop in India").slice(
      0,
      800,
    );
    const key = this.anthropicKey();
    if (!key) {
      const billed = await this.entitlements.consumeAi(userId);
      return {
        source: "demo" as const,
        items: this.demoVariations(seed),
        remaining: billed.remaining,
        cap: billed.cap,
      };
    }

    const prompt = `You write for Indian founders and D2C brands on postN.
Return JSON only: {"items":["...","...","...","...","..."]} — exactly 5 strings.
1) LinkedIn founder note, 400-900 chars, IST, no hashtag spam.
2) Short X post under 260 characters.
3) Punchier rewrite of the draft.
4) Same idea, warehouse/ops tone.
5) Same idea with a clear CTA (comment, reminder, or link-in-comments).
Draft/topic:\n${seed}`;

    const text = await this.claude(key, prompt);
    const items = this.parseList(text);
    const billed = await this.entitlements.consumeAi(userId);
    return {
      source: "haiku" as const,
      items: items.length ? items : this.demoVariations(seed),
      remaining: billed.remaining,
      cap: billed.cap,
    };
  }

  async suggest(userId: string, draft: string, kind: string) {
    await this.entitlements.assertAi(userId);
    const seed = draft.trim() || "mango drop this week";
    const key = this.anthropicKey();
    const jobs: Record<string, string> = {
      "shorten-x": "Rewrite under 240 characters for X. One paragraph. No hashtags unless one is essential.",
      hashtags: "Give 6 India-relevant hashtags, space-separated, no commentary.",
      india: "Rewrite for Indian D2C. Mention IST if a time exists. Keep the voice. Under 500 characters.",
    };
    const instruction = jobs[kind] ?? jobs.india;
    if (!key) {
      const billed = await this.entitlements.consumeAi(userId);
      return {
        source: "demo" as const,
        text: this.demoSuggest(seed, kind),
        remaining: billed.remaining,
        cap: billed.cap,
      };
    }
    const text = await this.claude(
      key,
      `${instruction}\n\nDraft:\n${seed}\n\nReturn only the result text.`,
    );
    const billed = await this.entitlements.consumeAi(userId);
    return { source: "haiku" as const, text: text.trim(), remaining: billed.remaining, cap: billed.cap };
  }

  async generateImage(userId: string, prompt: string) {
    const status = await this.entitlements.imageStatus(userId);
    if (status.remaining <= 0) {
      throw new BadRequestException(
        `${status.plan === "TRIAL" ? "Trial" : status.plan === "PRO" ? "Pro" : status.plan === "STUDIO" ? "Studio" : "This account"} includes ${status.cap} image gens. Upgrade for more.`,
      );
    }
    const key = this.googleKey();
    if (!key) {
      throw new BadRequestException(
        "Add GOOGLE_AI_API_KEY to apps/api/.env to generate images.",
      );
    }
    const idea = prompt.trim();
    if (!idea) {
      throw new BadRequestException("Describe the image you want.");
    }
    const model =
      this.config.get<string>("GEMINI_IMAGE_MODEL")?.trim() ||
      "gemini-3.1-flash-image";
    const promptText = `Generate a social post image, 1:1, photoreal, no watermarks, no letters on the image. ${idea}`;
    const inline = await this.geminiImage(key, model, promptText);
    if (!inline?.data) {
      throw new BadRequestException("Model returned no image. Try a simpler prompt.");
    }
    const billed = await this.entitlements.consumeImage(userId);
    return {
      dataUrl: `data:${inline.mimeType ?? "image/png"};base64,${inline.data}`,
      remaining: billed.remaining,
      cap: billed.cap,
    };
  }

  imageStatus(userId: string) {
    return this.entitlements.imageStatus(userId);
  }

  private anthropicKey() {
    return this.config.get<string>("ANTHROPIC_API_KEY")?.trim() || "";
  }

  private googleKey() {
    return (
      this.config.get<string>("GOOGLE_AI_API_KEY")?.trim() ||
      this.config.get<string>("GEMINI_API_KEY")?.trim() ||
      ""
    );
  }

  /** Gemini 3.1 Flash Image. 2.5 Flash Image retired 2 Oct 2026. */
  private async geminiImage(key: string, model: string, text: string) {
    const viaContent = await this.geminiGenerateContent(key, model, text);
    if (viaContent.ok && viaContent.image) return viaContent.image;
    const viaInteractions = await this.geminiInteractions(key, model, text);
    if (viaInteractions.image) return viaInteractions.image;
    if (!viaContent.ok) {
      throw new BadRequestException(viaContent.error ?? "Image generation failed");
    }
    if (!viaInteractions.ok) {
      throw new BadRequestException(viaInteractions.error ?? "Image generation failed");
    }
    return null;
  }

  private async geminiGenerateContent(key: string, model: string, text: string) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
        }),
      },
    );
    const json = (await res.json()) as GeminiImageJson;
    return {
      ok: res.ok,
      error: json.error?.message,
      image: this.pickGeminiImage(json),
    };
  }

  private async geminiInteractions(key: string, model: string, text: string) {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key,
        },
        body: JSON.stringify({
          model,
          input: [{ type: "text", text }],
        }),
      },
    );
    const json = (await res.json()) as GeminiImageJson;
    return {
      ok: res.ok,
      error: json.error?.message,
      image: this.pickGeminiImage(json),
    };
  }

  private pickGeminiImage(json: GeminiImageJson) {
    const parts = json.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      const inline = part.inlineData ?? part.inline_data;
      if (inline?.data) {
        return {
          data: inline.data,
          mimeType: inline.mimeType ?? inline.mime_type ?? "image/png",
        };
      }
    }
    const output = json.output_image ?? json.outputImage;
    if (output?.data) {
      return {
        data: output.data,
        mimeType: output.mimeType ?? output.mime_type ?? "image/png",
      };
    }
    return null;
  }

  private async claude(key: string, prompt: string) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const json = (await res.json()) as {
      error?: { message?: string };
      content?: Array<{ type: string; text?: string }>;
    };
    if (!res.ok) {
      throw new BadRequestException(json.error?.message ?? "Claude request failed");
    }
    return json.content?.find((part) => part.type === "text")?.text ?? "";
  }

  private parseList(raw: string) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return [];
    try {
      const parsed = JSON.parse(match[0]) as { items?: unknown };
      return Array.isArray(parsed.items)
        ? parsed.items.filter((item): item is string => typeof item === "string").slice(0, 5)
        : [];
    } catch {
      return [];
    }
  }

  private demoVariations(seed: string) {
    const short = seed.slice(0, 80);
    return [
      `The drop is live from Bhubaneswar. Same-day packing, IST. ${short}`,
      `Warehouse lights on. ${short}`.slice(0, 240),
      `We didn’t wait for a marketplace. ${short}`,
      `Ops note:  ${short} — packing starts in 20 minutes.`,
      `${short}\n\nComment “IST” if you want the Sunday reminder.`,
    ];
  }

  private demoSuggest(seed: string, kind: string) {
    if (kind === "hashtags") return "#D2CIndia #MadeInIndia #FounderLife #Odisha #SmallBatch #IST";
    if (kind === "shorten-x") return seed.slice(0, 220);
    return `${seed}\n\nIST. If you’re ordering from India, tonight still works.`;
  }
}
