"use client";

import {
  LINKEDIN_LIMIT,
  LINKEDIN_SEE_MORE,
  PLATFORM_LIMITS,
  TELEGRAM_CAPTION,
  X_LIMIT,
  xCharCount,
} from "@/lib/compose-text";

export function LinkedInPreview({
  name,
  handle,
  avatar,
  body,
  image,
  when,
}: {
  name: string;
  handle: string;
  avatar: string | null;
  body: string;
  image: string | null;
  when: string;
}) {
  const clipped = body.length > LINKEDIN_SEE_MORE;
  const shown = clipped ? body.slice(0, LINKEDIN_SEE_MORE).trimEnd() : body;
  const count = Array.from(body).length;
  const over = count > LINKEDIN_LIMIT;

  return (
    <article className="overflow-hidden rounded-2xl bg-[#f4f2ee] text-[#1b1f23] shadow-[0_12px_40px_-24px_rgba(0,0,0,0.6)]">
      <header className="flex items-center gap-2 px-3 pt-3">
        <Face name={name} src={avatar} tone="in" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold leading-tight">{name}</p>
          <p className="truncate text-[11px] text-[#666]">
            {handle} · {when} · 🌐
          </p>
        </div>
      </header>
      <p className="whitespace-pre-wrap px-3 pt-2 text-[14px] leading-snug">
        {shown || "Your LinkedIn post shows up here."}
        {clipped ? (
          <span className="text-[#666]">
            {" "}
            … <span className="font-semibold">see more</span>
          </span>
        ) : null}
      </p>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="mt-2 max-h-56 w-full object-cover" />
      ) : null}
      <footer className="flex justify-between px-3 py-2 text-[11px] font-semibold text-[#666]">
        <span>Like</span>
        <span>Comment</span>
        <span>Repost</span>
        <span>Send</span>
      </footer>
      <p
        className={`px-3 pb-2 text-right text-[10px] font-bold ${
          over ? "text-[#cc1010]" : "text-[#666]"
        }`}
      >
        {count.toLocaleString("en-IN")} / {LINKEDIN_LIMIT}
      </p>
    </article>
  );
}

export function XPreview({
  name,
  handle,
  avatar,
  body,
  image,
  when,
}: {
  name: string;
  handle: string;
  avatar: string | null;
  body: string;
  image: string | null;
  when: string;
}) {
  const count = xCharCount(body);
  const over = count > X_LIMIT;

  return (
    <article className="overflow-hidden rounded-2xl bg-black text-[#e7e9ea] shadow-[0_12px_40px_-24px_rgba(0,0,0,0.8)]">
      <header className="flex items-center gap-2 px-3 pt-3">
        <Face name={name} src={avatar} tone="x" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold leading-tight">
            {name}{" "}
            <span className="font-normal text-[#71767b]">
              @{handle.replace(/^@/, "")} · {when}
            </span>
          </p>
        </div>
      </header>
      <p className="whitespace-pre-wrap px-3 pt-2 text-[15px] leading-snug">
        {body || "Your post on X shows up here."}
      </p>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          className="mx-3 mt-2 max-h-52 w-[calc(100%-1.5rem)] rounded-2xl object-cover"
        />
      ) : null}
      <footer className="flex justify-between px-6 py-3 text-[12px] text-[#71767b]">
        <span>Reply</span>
        <span>Repost</span>
        <span>Like</span>
        <span>Share</span>
      </footer>
      <p
        className={`px-3 pb-2 text-right text-[10px] font-bold ${
          over ? "text-[#f4212e]" : "text-[#71767b]"
        }`}
      >
        {count} / {X_LIMIT}
        {over ? " · too long for X" : ""}
      </p>
    </article>
  );
}

type PreviewProps = {
  name: string;
  handle: string;
  avatar: string | null;
  body: string;
  image: string | null;
  when: string;
};

export function TelegramPreview({ name, handle, body, image }: PreviewProps) {
  const count = Array.from(body).length;
  const over = count > PLATFORM_LIMITS.TELEGRAM;
  const captionOver = Boolean(image) && count > TELEGRAM_CAPTION;
  return (
    <article className="overflow-hidden rounded-2xl bg-[#182533] text-[#e8eef4] shadow-[0_12px_40px_-24px_rgba(0,0,0,0.8)]">
      <header className="flex items-center gap-2 px-3 pt-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-[#229ed9] text-sm font-extrabold">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold">{name}</p>
          <p className="truncate text-[11px] text-[#8aa0b5]">
            {handle.startsWith("@") ? handle : `@${handle}`}
          </p>
        </div>
      </header>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="mt-2 max-h-52 w-full object-cover" />
      ) : null}
      <p className="whitespace-pre-wrap px-3 py-2 text-[14px] leading-snug">
        {body || "Your Telegram channel post shows up here."}
      </p>
      <p
        className={`px-3 pb-2 text-right text-[10px] font-bold ${
          over || captionOver ? "text-[#ff8a80]" : "text-[#8aa0b5]"
        }`}
      >
        {count} / {image ? TELEGRAM_CAPTION : PLATFORM_LIMITS.TELEGRAM}
        {captionOver ? " · caption max 1024 with a photo" : ""}
      </p>
    </article>
  );
}

export function SlackPreview({ name, handle, body, image, when }: PreviewProps) {
  const count = Array.from(body).length;
  const over = count > PLATFORM_LIMITS.SLACK;
  return (
    <article className="overflow-hidden rounded-2xl bg-white text-[#1d1c1d] shadow-[0_12px_40px_-24px_rgba(0,0,0,0.6)]">
      <p className="border-b border-[#eee] px-3 py-2 text-[12px] font-bold text-[#616061]">
        #{handle.replace(/^@/, "") || "postn-test"}
      </p>
      <div className="flex gap-2 px-3 py-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#4a154b] text-xs font-extrabold text-white">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-bold">
            {name}{" "}
            <span className="font-normal text-[#616061]">{when}</span>
          </p>
          <p className="whitespace-pre-wrap text-[14px] leading-snug">
            {body || "Your Slack message shows up here."}
          </p>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="mt-2 max-h-40 rounded-md object-cover" />
          ) : null}
        </div>
      </div>
      <p
        className={`px-3 pb-2 text-right text-[10px] font-bold ${
          over ? "text-[#e01e5a]" : "text-[#616061]"
        }`}
      >
        {count.toLocaleString("en-IN")} / {PLATFORM_LIMITS.SLACK.toLocaleString("en-IN")}
      </p>
    </article>
  );
}

export function DiscordPreview({ name, handle, body, image, when }: PreviewProps) {
  const count = Array.from(body).length;
  const over = count > PLATFORM_LIMITS.DISCORD;
  return (
    <article className="overflow-hidden rounded-2xl bg-[#313338] text-[#f2f3f5] shadow-[0_12px_40px_-24px_rgba(0,0,0,0.8)]">
      <p className="px-3 pt-2 text-[11px] font-bold uppercase tracking-wide text-[#b5bac1]">
        #{handle.replace(/^@/, "") || "postn-test"}
      </p>
      <div className="flex gap-2 px-3 py-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#5865f2] text-xs font-extrabold">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-bold">
            postN{" "}
            <span className="font-normal text-[#b5bac1]">
              {name} · {when}
            </span>
          </p>
          <p className="whitespace-pre-wrap text-[14px] leading-snug">
            {body || "Your Discord webhook message shows up here."}
          </p>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="mt-2 max-h-40 rounded-md object-cover" />
          ) : null}
        </div>
      </div>
      <p
        className={`px-3 pb-2 text-right text-[10px] font-bold ${
          over ? "text-[#f23f42]" : "text-[#b5bac1]"
        }`}
      >
        {count} / {PLATFORM_LIMITS.DISCORD}
      </p>
    </article>
  );
}

export function MediumPreview({ name, body, image, when }: PreviewProps) {
  const lines = body.split("\n").filter((line) => line.trim());
  const title = lines[0]?.slice(0, 80) || "Title from your first line";
  const rest = lines.slice(1).join("\n") || body;
  const count = Array.from(body).length;
  return (
    <article className="overflow-hidden rounded-2xl bg-white text-[#242424] shadow-[0_12px_40px_-24px_rgba(0,0,0,0.6)]">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="max-h-40 w-full object-cover" />
      ) : null}
      <div className="p-4">
        <p className="text-[11px] font-semibold text-[#6b6b6b]">
          Draft · {name} · {when}
        </p>
        <h3 className="mt-1 text-lg font-extrabold leading-tight">{title}</h3>
        <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-[14px] leading-relaxed text-[#3d3d3d]">
          {rest || "Your Medium draft shows up here."}
        </p>
      </div>
      <p className="px-4 pb-3 text-right text-[10px] font-bold text-[#6b6b6b]">
        {count.toLocaleString("en-IN")} chars · saved as draft
      </p>
    </article>
  );
}

export function ChannelPreview({
  platform,
  name,
  handle,
  avatar,
  body,
  image,
  when,
}: PreviewProps & { platform: string }) {
  const props = { name, handle, avatar, body, image, when };
  switch (platform) {
    case "TWITTER":
      return <XPreview {...props} />;
    case "TELEGRAM":
      return <TelegramPreview {...props} />;
    case "SLACK":
      return <SlackPreview {...props} />;
    case "DISCORD":
      return <DiscordPreview {...props} />;
    case "LINKEDIN_PAGE":
      return <LinkedInPreview {...props} />;
    case "DEVTO":
      return <DevtoPreview {...props} />;
    default:
      return <LinkedInPreview {...props} />;
  }
}

export function DevtoPreview({ name, handle, body, image, when }: PreviewProps) {
  const lines = body.split("\n").filter((line) => line.trim());
  const title = lines[0]?.slice(0, 80) || "Title from your first line";
  const rest = lines.slice(1).join("\n") || body;
  const count = Array.from(body).length;
  return (
    <article className="overflow-hidden rounded-2xl border border-[#d6d6d7] bg-white text-[#171717] shadow-[0_12px_40px_-24px_rgba(0,0,0,0.6)]">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="max-h-40 w-full object-cover" />
      ) : null}
      <div className="p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#404040]">
          Unpublished · {handle || name} · {when}
        </p>
        <h3 className="mt-1 text-lg font-black leading-tight">{title}</h3>
        <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-[14px] leading-relaxed">
          {rest || "Your Dev.to article shows up here."}
        </p>
      </div>
      <p className="px-4 pb-3 text-right text-[10px] font-bold text-[#575757]">
        {count.toLocaleString("en-IN")} chars · unpublished
      </p>
    </article>
  );
}

function Face({
  name,
  src,
  tone,
}: {
  name: string;
  src: string | null;
  tone: "in" | "x";
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className="size-10 rounded-full object-cover" />;
  }
  return (
    <span
      className={`flex size-10 items-center justify-center rounded-full text-sm font-extrabold ${
        tone === "in" ? "bg-[#0a66c2] text-white" : "bg-foreground text-background"
      }`}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
