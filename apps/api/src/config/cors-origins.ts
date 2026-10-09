export function corsOrigins(env: {
  FRONTEND_URL?: string;
  FRONTEND_URLS?: string;
} = process.env) {
  const primary = (env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const extra = (env.FRONTEND_URLS ?? "")
    .split(",")
    .map((row) => row.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  const set = new Set<string>([primary, ...extra]);
  for (const origin of [...set]) {
    try {
      const url = new URL(origin);
      if (url.hostname.startsWith("www.")) {
        url.hostname = url.hostname.slice(4);
        set.add(url.origin);
      } else if (url.hostname.includes(".")) {
        url.hostname = `www.${url.hostname}`;
        set.add(url.origin);
      }
    } catch {
      set.delete(origin);
    }
  }
  return [...set];
}
