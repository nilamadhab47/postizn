import type { Platform } from "@prisma/client";
import type { ChannelPlan, ConnectMode, TokenField } from "../channel-catalog";

export type AuthResult = {
  platformId: string;
  username: string;
  displayName: string;
  avatar?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: Date;
};

export type PublishInput = {
  content: string;
  mediaUrls: string[];
  accessToken: string;
  platformId: string;
};

export type UploadInput = {
  accessToken: string;
  body: Buffer;
  mimeType: string;
  fileName: string;
};

export abstract class BaseProvider {
  abstract readonly platform: Platform;
  abstract readonly slug: string;
  abstract readonly label: string;
  readonly plan: ChannelPlan = "PRO";
  readonly connectMode: ConnectMode = "oauth";
  readonly tokenFields: TokenField[] = [];
  readonly blurb: string = "";

  abstract isConfigured(): boolean;

  async authenticateToken(_fields: Record<string, string>): Promise<AuthResult> {
    throw new Error("This channel uses OAuth");
  }

  abstract createAuthUrl(input: {
    state: string;
    codeVerifier: string;
    redirectUri: string;
  }): string;

  abstract authenticate(input: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<AuthResult>;

  abstract refreshToken(refreshToken: string): Promise<AuthResult>;

  abstract uploadMedia(input: UploadInput): Promise<{ id: string }>;

  abstract publishPost(input: PublishInput): Promise<{ platformPostId: string }>;
}
