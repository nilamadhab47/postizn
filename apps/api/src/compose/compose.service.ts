import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { imageCap } from "../plan/entitlements";

const imageUses = new Map<string, number>();


@Injectable()
export class ComposeService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async variations(userId: string, draft: string, topic?: string) {
    const seed = (topic?.trim() || draft.trim() || "D2C drop in India").slice(
      0,
      800,
    );
    const key = this.anthropicKey();
    if (!key) return { source: "demo" as const, items: this.demoVariations(seed) };

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
    return { source: "claude" as const, items: items.length ? items : this.demoVariations(seed) };
  }

  async suggest(userId: string, draft: string, kind: string) {
    const seed = draft.trim() || "mango drop this week";
    const key = this.anthropicKey();
    const jobs: Record<string, string> = {
      "shorten-x": "Rewrite under 240 characters for X. One paragraph. No hashtags unless one is essential.",
      hashtags: "Give 6 India-relevant hashtags, space-separated, no commentary.",
      india: "Rewrite for Indian D2C. Mention IST if a time exists. Keep the voice. Under 500 characters.",
    };
    const instruction = jobs[kind] ?? jobs.india;
    if (!key) {
      return { source: "demo" as const, text: this.demoSuggest(seed, kind) };
    }
    const text = await this.claude(
      key,
      `${instruction}\n\nDraft:\n${seed}\n\nReturn only the result text.`,
    );
    return { source: "claude" as const, text: text.trim() };
  }

  async generateImage(userId: string, prompt: string, plan: "FREE" | "PRO") {
    const used = imageUses.get(userId) ?? 0;
    const cap = imageCap(plan);
    if (cap != null && used >= cap) {
      throw new BadRequestException(
        "Test image cap reached. PRO unlocks more generations.",
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
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Generate a social post image, 1:1, photoreal, no watermarks, no letters on the image. ${idea}`,
                },
              ],
            },
          ],
          generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
        }),
      },
    );
    const json = (await res.json()) as {
      error?: { message?: string };
      candidates?: Array<{
        content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> };
      }>;
    };
    if (!res.ok) {
      throw new BadRequestException(json.error?.message ?? "Image generation failed");
    }
    const inline = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)
      ?.inlineData;
    if (!inline?.data) {
      throw new BadRequestException("Model returned no image. Try a simpler prompt.");
    }
    if (cap != null) imageUses.set(userId, used + 1);
    const remaining = cap == null ? null : cap - used - 1;
    return {
      dataUrl: `data:${inline.mimeType ?? "image/png"};base64,${inline.data}`,
      remaining,
      cap,
    };
  }

  async planOf(userId: string): Promise<"FREE" | "PRO"> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    return user?.plan === "PRO" ? "PRO" : "FREE";
  }

  imageStatus(userId: string, plan: "FREE" | "PRO") {
    const used = imageUses.get(userId) ?? 0;
    const cap = imageCap(plan);
    return {
      plan,
      cap,
      remaining: cap == null ? null : Math.max(0, cap - used),
    };
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

  private async claude(key: string, prompt: string) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
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
