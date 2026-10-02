const GOLD = "#ffb020";
const INK = "#fff6e8";
const MUTED = "rgba(255,246,232,0.78)";
const FAINT = "rgba(255,246,232,0.55)";
const BG = "#0e0b16";
const CARD = "#14101f";
const LINE = "#4a3f63";

export type MailContent = {
  subject: string;
  text: string;
  html: string;
};

export type WelcomeVars = {
  name: string | null;
  origin: string;
  trialDays: number;
};

export type TrialReminderVars = {
  name: string | null;
  origin: string;
  daysLeft: number;
};

export type TrialEndedVars = {
  name: string | null;
  origin: string;
};

export type PublishMailVars = {
  name: string | null;
  origin: string;
  postId: string;
  snippet: string;
  published: string[];
  failed: { label: string; reason: string }[];
};

export type PaidMailVars = {
  name: string | null;
  origin: string;
  plan: "PRO" | "STUDIO";
  interval: "monthly" | "yearly";
  amountLabel: string;
  periodEndLabel: string | null;
};

function greet(name: string | null) {
  const first = name?.trim().split(/\s+/)[0];
  return first ? `Hi ${first}` : "Hi";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function joinAnd(items: string[]) {
  const unique = [...new Set(items.filter(Boolean))];
  if (unique.length <= 1) return unique[0] ?? "";
  if (unique.length === 2) return `${unique[0]} and ${unique[1]}`;
  return `${unique.slice(0, -1).join(", ")}, and ${unique[unique.length - 1]}`;
}

function clip(text: string, max = 140) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

function planName(plan: "PRO" | "STUDIO") {
  return plan === "STUDIO" ? "Studio" : "Pro";
}

function shell(input: {
  origin: string;
  preheader: string;
  eyebrow: string;
  title: string;
  paragraphs: string[];
  ctaLabel: string;
  ctaHref: string;
  footer: string;
}) {
  const origin = input.origin.replace(/\/$/, "");
  const logo = `${origin}/icon.png`;
  const paras = input.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${MUTED};">${p}</p>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background:${BG};color:${INK};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:${CARD};border:1px solid ${LINE};border-radius:24px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 8px;text-align:center;">
              <a href="${origin}" style="text-decoration:none;color:${INK};">
                <img src="${logo}" width="40" height="40" alt="postN" style="border-radius:12px;display:block;margin:0 auto 10px;" />
                <span style="font-family:Georgia,serif;font-size:22px;font-weight:800;letter-spacing:-0.4px;">
                  post<span style="color:${GOLD};">N</span>
                </span>
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:${GOLD};">
                ${escapeHtml(input.eyebrow)}
              </p>
              <h1 style="margin:0 0 18px;font-size:28px;line-height:1.15;letter-spacing:-0.6px;color:${INK};">
                ${escapeHtml(input.title)}
              </h1>
              ${paras}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 32px 24px;">
              <a href="${input.ctaHref}" style="display:inline-block;background:${GOLD};color:#1a1204;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;font-weight:800;text-decoration:none;padding:14px 28px;border-radius:999px;">
                ${escapeHtml(input.ctaLabel)}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:center;border-top:1px solid ${LINE};">
              <p style="margin:0;font-size:12px;line-height:1.5;color:${FAINT};">
                ${escapeHtml(input.footer)}<br />
                <a href="${origin}/terms" style="color:${FAINT};">Terms</a>
                ·
                <a href="${origin}/privacy" style="color:${FAINT};">Privacy</a>
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

export function welcomeMail(vars: WelcomeVars): MailContent {
  const subject = "You're in. LinkedIn and X, 14 days, no card.";
  const text = [
    `${greet(vars.name)},`,
    "",
    `Your postN trial is live for ${vars.trialDays} days. LinkedIn and X only — write once, post to both.`,
    "",
    `Connect a channel: ${vars.origin}/accounts`,
    `Then compose: ${vars.origin}/compose`,
    "",
    "No spam. Just the mail that matters.",
  ].join("\n");
  const html = shell({
    origin: vars.origin,
    preheader: `Trial is ${vars.trialDays} days. Connect LinkedIn or X and write once.`,
    eyebrow: "Welcome",
    title: "Quit the extra tabs.",
    paragraphs: [
      `${escapeHtml(greet(vars.name))} — your trial is live for <strong style="color:${INK};">${vars.trialDays} days</strong>. LinkedIn and X. No card.`,
      "Write it once, preview it everywhere, hit send — or schedule it for the minute they're actually awake.",
      "Connect a channel first. Then the composer is the whole job.",
    ],
    ctaLabel: "Connect a channel →",
    ctaHref: `${vars.origin}/accounts`,
    footer: "You're getting this because you created a postN account.",
  });
  return { subject, text, html };
}

export function trialReminderMail(vars: TrialReminderVars): MailContent {
  const when = vars.daysLeft <= 1 ? "tomorrow" : `in ${vars.daysLeft} days`;
  const subject =
    vars.daysLeft <= 1
      ? "Trial ends tomorrow"
      : `${vars.daysLeft} days left on trial`;
  const text = [
    `${greet(vars.name)},`,
    "",
    `Your postN trial ends ${when}. After that, LinkedIn, X, and the rest of the grid wait on Pro.`,
    "",
    `Upgrade: ${vars.origin}/settings?tab=account`,
  ].join("\n");
  const html = shell({
    origin: vars.origin,
    preheader: `Trial ends ${when}. After that, pay to use.`,
    eyebrow: "Trial",
    title: vars.daysLeft <= 1 ? "Last day." : `${vars.daysLeft} days left.`,
    paragraphs: [
      `${escapeHtml(greet(vars.name))} — after that, posting pauses. LinkedIn, X, and every other channel wait on Pro.`,
      "Pro unlocks the grid and higher limits. Launch price is still on.",
    ],
    ctaLabel: "See Pro →",
    ctaHref: `${vars.origin}/settings?tab=account`,
    footer: "You're getting this because your postN trial is ending soon.",
  });
  return { subject, text, html };
}

export function trialEndedMail(vars: TrialEndedVars): MailContent {
  const subject = "Trial ended. Pay to use.";
  const text = [
    `${greet(vars.name)},`,
    "",
    "Your 14-day trial just closed. LinkedIn, X, and the rest of the grid wait on Pro. Drafts stay.",
    "",
    `Unlock postN: ${vars.origin}/settings?tab=account`,
  ].join("\n");
  const html = shell({
    origin: vars.origin,
    preheader: "Posting is paused. Pay to use LinkedIn, X, and the rest.",
    eyebrow: "Trial ended",
    title: "The clock ran out.",
    paragraphs: [
      `${escapeHtml(greet(vars.name))} — LinkedIn, X, and every other channel wait on Pro. You can still open the app and look around.`,
      "Drafts stay. Checkout is in Settings.",
    ],
    ctaLabel: "Continue on Pro →",
    ctaHref: `${vars.origin}/settings?tab=account`,
    footer: "You're getting this because your postN trial closed.",
  });
  return { subject, text, html };
}

export function publishMail(vars: PublishMailVars): MailContent {
  const href = `${vars.origin}/posts`;
  const snippet = clip(vars.snippet);
  const quote = snippet ? `“${snippet}”` : "Your post";
  const failedLabels = vars.failed.map((row) => row.label);
  const reason = vars.failed[0]?.reason;

  if (vars.failed.length === 0) {
    const where = joinAnd(vars.published) || "your channels";
    const subject = `Posted on ${where}`;
    const text = [`${quote} went live on ${where}.`, "", href].join("\n");
    const html = shell({
      origin: vars.origin,
      preheader: `Went live on ${where}.`,
      eyebrow: "Posted",
      title: `Live on ${where}.`,
      paragraphs: [
        snippet
          ? `<span style="color:${INK};">${escapeHtml(quote)}</span>`
          : "Your post went out.",
      ],
      ctaLabel: "Open posts →",
      ctaHref: href,
      footer: "You're getting this because a scheduled or instant post went out.",
    });
    return { subject, text, html };
  }

  if (vars.published.length) {
    const live = joinAnd(vars.published);
    const down = joinAnd(failedLabels);
    const subject = `Partly posted — ${down} did not go out`;
    const text = [
      `${quote} went live on ${live}. ${down} did not go out.`,
      reason ?? "",
      "",
      href,
    ]
      .filter(Boolean)
      .join("\n");
    const html = shell({
      origin: vars.origin,
      preheader: `${down} did not go out.`,
      eyebrow: "Partly posted",
      title: `${down} didn't go out.`,
      paragraphs: [
        `Went live on <strong style="color:${INK};">${escapeHtml(live)}</strong>.`,
        reason ? escapeHtml(reason) : "Open the post to retry the channel that missed.",
      ],
      ctaLabel: "Retry from posts →",
      ctaHref: href,
      footer: "You're getting this because one of the channels missed.",
    });
    return { subject, text, html };
  }

  const down = joinAnd(failedLabels) || "your channels";
  const subject = `Did not go out on ${down}`;
  const text = [reason ? `${down}: ${reason}` : `${quote} did not go out.`, "", href].join(
    "\n",
  );
  const html = shell({
    origin: vars.origin,
    preheader: reason ?? `${down} missed.`,
    eyebrow: "Did not go out",
    title: `${down} missed.`,
    paragraphs: [
      reason
        ? escapeHtml(reason)
        : "The channel did not accept the post. Open it to see why and retry.",
    ],
    ctaLabel: "See what happened →",
    ctaHref: href,
    footer: "You're getting this because a post failed to publish.",
  });
  return { subject, text, html };
}

export function paymentSucceededMail(vars: PaidMailVars): MailContent {
  const plan = planName(vars.plan);
  const cadence = vars.interval === "yearly" ? "year" : "month";
  const subject = `You're on ${plan}`;
  const renew = vars.periodEndLabel ? ` Next renewal ${vars.periodEndLabel}.` : "";
  const text = [
    `${greet(vars.name)},`,
    "",
    `${plan} is on — ${vars.amountLabel} / ${cadence}.${renew}`,
    "The rest of the grid and the higher limits are unlocked.",
    "",
    `${vars.origin}/settings?tab=account`,
  ].join("\n");
  const html = shell({
    origin: vars.origin,
    preheader: `${plan} is live. ${vars.amountLabel} / ${cadence}.`,
    eyebrow: plan,
    title: `You're on ${plan}.`,
    paragraphs: [
      `${escapeHtml(greet(vars.name))} — ${escapeHtml(vars.amountLabel)} / ${cadence}.${renew ? ` Next renewal <strong style="color:${INK};">${escapeHtml(vars.periodEndLabel ?? "")}</strong>.` : ""}`,
      "Every live channel, higher daily and monthly caps, more image gens and Claude writes. Receipts stay in Settings.",
    ],
    ctaLabel: "Open postN →",
    ctaHref: `${vars.origin}/compose`,
    footer: `You're getting this because you subscribed to postN ${plan}.`,
  });
  return { subject, text, html };
}

export function subscriptionRenewedMail(vars: PaidMailVars): MailContent {
  const plan = planName(vars.plan);
  const cadence = vars.interval === "yearly" ? "year" : "month";
  const subject = `${plan} renewed`;
  const until = vars.periodEndLabel ? ` Next renewal ${vars.periodEndLabel}.` : "";
  const text = [
    `${greet(vars.name)},`,
    "",
    `${plan} renewed — ${vars.amountLabel} / ${cadence}.${until}`,
    "",
    `${vars.origin}/settings?tab=account`,
  ].join("\n");
  const html = shell({
    origin: vars.origin,
    preheader: `${plan} renewed. ${vars.amountLabel} / ${cadence}.`,
    eyebrow: "Receipt",
    title: `${plan} renewed.`,
    paragraphs: [
      `${escapeHtml(vars.amountLabel)} / ${cadence}.${until ? ` Next renewal <strong style="color:${INK};">${escapeHtml(vars.periodEndLabel ?? "")}</strong>.` : ""}`,
      "Nothing else to do. The grid stays on.",
    ],
    ctaLabel: "Billing →",
    ctaHref: `${vars.origin}/settings?tab=account`,
    footer: `You're getting this because your postN ${plan} subscription renewed.`,
  });
  return { subject, text, html };
}

export function paymentFailedMail(vars: PaidMailVars): MailContent {
  const plan = planName(vars.plan);
  const subject = `We couldn't renew ${plan}`;
  const text = [
    `${greet(vars.name)},`,
    "",
    `The ${plan} renewal did not go through. Update the card on file so the grid stays unlocked.`,
    "",
    `${vars.origin}/settings?tab=account`,
  ].join("\n");
  const html = shell({
    origin: vars.origin,
    preheader: `${plan} renewal missed. Update the card to keep the grid.`,
    eyebrow: "Payment",
    title: `We couldn't renew ${plan}.`,
    paragraphs: [
      `${escapeHtml(greet(vars.name))} — the charge did not go through. Channels stay as they are until the subscription is halted.`,
      "Update the card in Settings. Razorpay will retry; we'll mail you if it still misses.",
    ],
    ctaLabel: "Update billing →",
    ctaHref: `${vars.origin}/settings?tab=account`,
    footer: `You're getting this because a postN ${plan} renewal failed.`,
  });
  return { subject, text, html };
}

export function subscriptionEndedMail(
  vars: PaidMailVars & { reason: "canceled" | "expired" },
): MailContent {
  const plan = planName(vars.plan);
  const ended = vars.reason === "expired" ? "expired" : "ended";
  const subject = `${plan} ${ended}`;
  const text = [
    `${greet(vars.name)},`,
    "",
    `${plan} ${ended}. LinkedIn, X, and the rest of the grid wait on Pro.`,
    "",
    `Resubscribe: ${vars.origin}/settings?tab=account`,
  ].join("\n");
  const html = shell({
    origin: vars.origin,
    preheader: `${plan} ${ended}. Pay to use postN again.`,
    eyebrow: plan,
    title: `${plan} ${ended}.`,
    paragraphs: [
      `${escapeHtml(greet(vars.name))} — posting is paused. Drafts stay. Come back whenever.`,
      "Checkout is in Settings.",
    ],
    ctaLabel: "Resubscribe →",
    ctaHref: `${vars.origin}/settings?tab=account`,
    footer: `You're getting this because your postN ${plan} subscription ${ended}.`,
  });
  return { subject, text, html };
}
