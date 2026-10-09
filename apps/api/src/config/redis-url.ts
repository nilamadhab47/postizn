export function assertRedisUrl(url: string, nodeEnv = process.env.NODE_ENV) {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error("REDIS_URL is missing.");
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("REDIS_URL is not a valid URL.");
  }
  if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") {
    throw new Error("REDIS_URL must be redis:// or rediss://.");
  }
  if (nodeEnv === "production" && !parsed.password) {
    throw new Error("REDIS_URL must include a password in production.");
  }
  return trimmed;
}
