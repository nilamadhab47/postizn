export function isWaitlistMode(config: {
  get: (key: string) => string | undefined;
}) {
  const raw = config.get("WAITLIST_MODE");
  if (raw != null && raw !== "") return raw === "true";
  return config.get("NODE_ENV") === "production";
}
