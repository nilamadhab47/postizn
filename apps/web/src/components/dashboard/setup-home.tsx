"use client";

import { ChannelIcon } from "@/components/accounts/channel-icons";
import { PayLink } from "@/components/billing/pay-link";

const PREVIEW_CHANNELS = [
  { slug: "linkedin", label: "LinkedIn" },
  { slug: "twitter", label: "X" },
  { slug: "telegram", label: "Telegram" },
  { slug: "slack", label: "Slack" },
] as const;

export function SetupHome({
  name,
  hasChannel,
}: {
  name: string;
  hasChannel: boolean;
}) {
  return (
    <section className="dash-glow relative overflow-hidden rounded-3xl border border-line p-6 sm:p-8">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-accent">
        First run
      </p>
      <h2 className="mt-3 max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">
        {hasChannel
          ? `${name}, write the first post.`
          : `${name}, connect a channel.`}
      </h2>
      <p className="mt-2 max-w-lg text-sm font-semibold text-muted">
        {hasChannel
          ? "LinkedIn, X, Telegram — one draft, every connected feed. Schedule it, and Home fills in."
          : "Nothing to show yet. Connect LinkedIn or X (free), then come back and write once."}
      </p>

      <ol className="mt-8 grid gap-3 sm:grid-cols-2">
        <Step
          n={1}
          title="Connect a channel"
          body="LinkedIn and X are on trial. Telegram, Slack, Discord, and Dev.to unlock on Pro."
          done={hasChannel}
          current={!hasChannel}
          href="/accounts?from=start"
          cta={hasChannel ? "Manage channels" : "Connect a channel"}
        />
        <Step
          n={2}
          title="Write your first post"
          body="Pick the IST time, drop a photo if you have one, then Schedule or Post now."
          done={false}
          current={hasChannel}
          href="/compose"
          cta="Open compose"
          locked={!hasChannel}
        />
      </ol>

      {!hasChannel ? (
        <div className="mt-8 flex flex-wrap items-center gap-2">
          {PREVIEW_CHANNELS.map((row) => (
            <span
              key={row.slug}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-background/40 px-2.5 py-1 text-xs font-bold"
            >
              <ChannelIcon slug={row.slug} className="size-4 rounded-md" />
              {row.label}
            </span>
          ))}
          <span className="text-xs font-semibold text-muted">+ more on PRO</span>
        </div>
      ) : null}
    </section>
  );
}

function Step({
  n,
  title,
  body,
  done,
  current,
  href,
  cta,
  locked,
}: {
  n: number;
  title: string;
  body: string;
  done: boolean;
  current: boolean;
  href: string;
  cta: string;
  locked?: boolean;
}) {
  return (
    <li
      className={`flex flex-col rounded-2xl border p-5 ${
        current
          ? "border-accent/50 bg-background/50"
          : "border-line bg-background/30"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex size-7 items-center justify-center rounded-full text-xs font-extrabold ${
            done
              ? "bg-[#6fbf62] text-[#102010]"
              : current
                ? "bg-accent text-accent-fg"
                : "border border-line text-muted"
          }`}
        >
          {done ? "✓" : n}
        </span>
        <p className="text-sm font-extrabold">{title}</p>
      </div>
      <p className="mt-2 flex-1 text-sm font-semibold text-muted">{body}</p>
      {locked ? (
        <p className="mt-4 text-xs font-bold uppercase tracking-wide text-muted">
          After you connect
        </p>
      ) : (
        <PayLink
          href={href}
          className={`mt-4 inline-flex w-fit rounded-xl px-3 py-2 text-sm font-bold ${
            current
              ? "bg-accent text-accent-fg"
              : "border border-line hover:border-accent"
          }`}
        >
          {cta}
        </PayLink>
      )}
    </li>
  );
}
