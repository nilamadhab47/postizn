import { BaseProvider, type AuthResult, type UploadInput } from "./base-provider";
import type { TokenField } from "../channel-catalog";

export abstract class TokenProvider extends BaseProvider {
  readonly plan = "PRO" as const;
  readonly connectMode = "token" as const;
  abstract readonly tokenFields: TokenField[];
  abstract readonly blurb: string;

  abstract authenticateToken(fields: Record<string, string>): Promise<AuthResult>;

  isConfigured() {
    return true;
  }

  createAuthUrl(_input: {
    state: string;
    codeVerifier: string;
    redirectUri: string;
  }): string {
    throw new Error("This channel uses a token form");
  }

  async authenticate(_input: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<AuthResult> {
    throw new Error("This channel uses a token form");
  }

  async refreshToken(refreshToken: string): Promise<AuthResult> {
    return {
      platformId: "token",
      username: this.slug,
      displayName: this.label,
      accessToken: refreshToken,
    };
  }

  async uploadMedia(_input: UploadInput): Promise<{ id: string }> {
    throw new Error("Media upload is not wired for this channel yet");
  }
}

export function field(fields: Record<string, string>, name: string) {
  return (fields[name] ?? "").trim();
}

export async function readJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}
