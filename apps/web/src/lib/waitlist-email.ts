import {
  CONTACT_EMAIL,
  LINKEDIN_URL,
  PRODUCTION_SITE_URL,
  SITE_NAME,
  SITE_URL,
  X_URL,
} from "@/lib/site";

const origin = SITE_URL || PRODUCTION_SITE_URL;

function abs(path: string) {
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

const CHANNELS = [
  { src: abs("/channels/linkedin.png"), alt: "LinkedIn" },
  { src: abs("/channels/x.png"), alt: "X" },
  { src: abs("/channels/telegram.png"), alt: "Telegram" },
  { src: abs("/channels/slack.png"), alt: "Slack" },
  { src: abs("/channels/discord.png"), alt: "Discord" },
  { src: abs("/channels/devto.png"), alt: "Dev.to" },
];

export function waitlistWelcomeSubject() {
  return "You're in. Don't start another tab.";
}

export function waitlistWelcomeText() {
  return [
    "You're on the postN waitlist.",
    "",
    "Copy. Paste. Reformat. Repeat — that's the old job. You just quit.",
    "",
    "While we finish the doors: one composer, every platform your audience lives on, scheduled for the minute they're actually awake.",
    "",
    `Peek at the product: ${origin}`,
    "",
    "X: " + X_URL,
    "LinkedIn: " + LINKEDIN_URL,
    "Email: " + CONTACT_EMAIL,
  ].join("\n");
}

export function waitlistWelcomeHtml() {
  const logo = abs("/icon.png");
  const banner = abs("/opengraph-image");
  const demo = `${origin}/#demo`;
  const features = `${origin}/#features`;
  const icons = CHANNELS.map(
    (c) =>
      `<img src="${c.src}" width="28" height="28" alt="${c.alt}" style="display:inline-block;border-radius:6px;border:1px solid #4a3f63;margin:0 4px;" />`,
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>You're on the waitlist</title>
</head>
<body style="margin:0;padding:0;background:#0e0b16;color:#fff6e8;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Seat reserved. The tab-juggling era now has an expiry date.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e0b16;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#14101f;border:1px solid #4a3f63;border-radius:24px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 12px;text-align:center;">
              <a href="${origin}" style="text-decoration:none;color:#fff6e8;">
                <img src="${logo}" width="40" height="40" alt="${SITE_NAME}" style="border-radius:12px;display:block;margin:0 auto 10px;" />
                <span style="font-family:Georgia,serif;font-size:22px;font-weight:800;letter-spacing:-0.4px;">
                  post<span style="color:#ffb020;">N</span>
                </span>
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 20px 0;">
              <a href="${demo}">
                <img src="${banner}" width="520" alt="Write once. Post everywhere." style="display:block;width:100%;max-width:520px;height:auto;border-radius:16px;border:1px solid #4a3f63;" />
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:#ffb020;">
                Seat reserved
              </p>
              <h1 style="margin:0;font-size:36px;line-height:1.1;letter-spacing:-1px;color:#fff6e8;">
                You're on the waitlist. 🎉
              </h1>
              <p style="margin:18px 0 0;font-size:17px;line-height:1.55;color:rgba(255,246,232,0.78);">
                Copy. Paste. Reformat. Repeat — that's the old job.<br />
                <strong style="color:#fff6e8;">You just quit.</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 32px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:rgba(255,246,232,0.78);font-size:15px;line-height:1.6;">
              <p style="margin:0 0 14px;">
                postN is one composer for every platform your audience lives on.
                Write it once, preview it everywhere, hit send (or schedule it for the minute they're actually awake).
              </p>
              <p style="margin:0;">What happens next:</p>
              <ol style="margin:8px 0 0;padding-left:20px;">
                <li style="margin:0 0 6px;">We finish the last doors. Quietly. No spam.</li>
                <li style="margin:0 0 6px;">You get one email when it's your turn — not a drip sequence.</li>
                <li style="margin:0;">Until then, the live demo on the site is the product playing itself.</li>
              </ol>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:18px 32px 6px;">
              ${icons}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:22px 32px 8px;">
              <a href="${demo}" style="display:inline-block;background:#ffb020;color:#1a1204;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;font-weight:800;text-decoration:none;padding:14px 28px;border-radius:999px;">
                Watch it work →
              </a>
              <p style="margin:12px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;">
                <a href="${features}" style="color:#8b6cff;text-decoration:none;">or skim the features first</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:center;border-top:1px solid #4a3f63;">
              <p style="margin:0 0 14px;font-size:13px;color:rgba(255,246,232,0.55);">
                Built by a founder who got tired of six tabs. Come say hi.
              </p>
              <p style="margin:0 0 16px;font-size:14px;">
                <a href="${X_URL}" style="color:#ffb020;text-decoration:none;margin:0 10px;">X / @MadhabCoder</a>
                <a href="${LINKEDIN_URL}" style="color:#ffb020;text-decoration:none;margin:0 10px;">LinkedIn</a>
                <a href="mailto:${CONTACT_EMAIL}" style="color:#ffb020;text-decoration:none;margin:0 10px;">Email</a>
              </p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:rgba(255,246,232,0.42);">
                You're getting this because you joined the ${SITE_NAME} waitlist.<br />
                No spam. Unsubscribe by just… not wanting it — reply and we'll drop you.<br />
                <a href="${origin}/terms" style="color:rgba(255,246,232,0.55);">Terms</a>
                ·
                <a href="${origin}/privacy" style="color:rgba(255,246,232,0.55);">Privacy</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function waitlistFounderSubject(email: string) {
  return `Waitlist: ${email} just grabbed a seat`;
}

export function waitlistFounderText(email: string) {
  return `${email} joined the ${SITE_NAME} waitlist.\n${origin}`;
}

export function waitlistFounderHtml(email: string) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;background:#14101f;color:#fff6e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px;">
    <tr>
      <td>
        <p style="margin:0 0 8px;color:#ffb020;font-size:12px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">New seat</p>
        <h1 style="margin:0 0 12px;font-size:24px;">${escapeHtml(email)}</h1>
        <p style="margin:0 0 18px;color:rgba(255,246,232,0.7);">just joined the ${SITE_NAME} waitlist.</p>
        <a href="mailto:${escapeHtml(email)}" style="display:inline-block;background:#ffb020;color:#1a1204;font-weight:800;text-decoration:none;padding:10px 18px;border-radius:999px;">Reply to them</a>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
