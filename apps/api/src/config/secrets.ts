import type { ConfigService } from "@nestjs/config";

export const MIN_SECRET_LENGTH = 32;

const PLACEHOLDERS = new Set([
  "",
  "dev-only-change-me",
  "replace-with-a-long-random-string",
  "replace-with-a-different-long-random-string",
  "changeme",
  "secret",
]);

export function assertUsableSecret(name: string, value: string): string {
  const secret = value.trim();
  if (PLACEHOLDERS.has(secret) || PLACEHOLDERS.has(secret.toLowerCase())) {
    throw new Error(
      `${name} is missing or still a placeholder. Set a random string of at least ${MIN_SECRET_LENGTH} characters.`,
    );
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`${name} must be at least ${MIN_SECRET_LENGTH} characters.`);
  }
  return secret;
}

export function assertAppSecrets(env: {
  JWT_SECRET?: string;
  TOKEN_ENCRYPTION_KEY?: string;
}) {
  const jwt = assertUsableSecret("JWT_SECRET", env.JWT_SECRET ?? "");
  const token = assertUsableSecret(
    "TOKEN_ENCRYPTION_KEY",
    env.TOKEN_ENCRYPTION_KEY ?? "",
  );
  if (jwt === token) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be different from JWT_SECRET.");
  }
  return { jwt, token };
}

export function jwtSecretFrom(config: ConfigService) {
  return assertUsableSecret("JWT_SECRET", config.get<string>("JWT_SECRET") ?? "");
}

export function tokenEncryptionSecretFrom(config: ConfigService) {
  return assertAppSecrets({
    JWT_SECRET: config.get<string>("JWT_SECRET") ?? "",
    TOKEN_ENCRYPTION_KEY: config.get<string>("TOKEN_ENCRYPTION_KEY") ?? "",
  }).token;
}

export function allowPlaintextSecrets() {
  return process.env.NODE_ENV !== "production";
}
