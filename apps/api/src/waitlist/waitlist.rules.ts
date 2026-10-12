const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type WaitlistJoin =
  | { kind: "honeypot" }
  | { kind: "invalid" }
  | { kind: "ok"; email: string };

export function parseWaitlistJoin(body: { email?: string; company?: string }): WaitlistJoin {
  if (body.company?.trim()) return { kind: "honeypot" };
  const email = (body.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 160) return { kind: "invalid" };
  return { kind: "ok", email };
}
