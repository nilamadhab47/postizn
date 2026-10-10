"use client";

import {
  LINKEDIN_LAYOUT_OPTIONS,
  MAX_FIRST_COMMENT,
  MAX_NEWSLETTER_PREVIEW,
  MAX_NEWSLETTER_SUBJECT,
  X_REPLY_OPTIONS,
  channelSettingsKind,
  type ChannelSettings,
  type LinkedInLayout,
  type XReplySetting,
} from "@postn/shared";

export function ChannelSettingsPanel({
  platform,
  settings,
  stillCount,
  onChange,
}: {
  platform: string;
  settings: ChannelSettings;
  stillCount: number;
  onChange: (next: ChannelSettings) => void;
}) {
  const kind = channelSettingsKind(platform);
  if (!kind) return null;

  if (kind === "reply") {
    const value = settings.reply ?? "everyone";
    return (
      <div className="border-t border-line px-4 py-3">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">
          Who can reply
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {X_REPLY_OPTIONS.map((row) => (
            <Chip
              key={row.id}
              on={value === row.id}
              onClick={() =>
                onChange(
                  compactSettings({
                    ...settings,
                    reply: row.id === "everyone" ? undefined : (row.id as XReplySetting),
                  }),
                )
              }
            >
              {row.label}
            </Chip>
          ))}
        </div>
      </div>
    );
  }

  if (kind === "newsletter") {
    const subject = settings.subject ?? "";
    const preview = settings.preview ?? "";
    return (
      <div className="space-y-4 border-t border-line px-4 py-3">
        <label className="block">
          <span className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-muted">
              Subject
            </span>
            <span className="text-[11px] font-semibold text-muted">
              {subject.length.toLocaleString("en-IN")} /{" "}
              {MAX_NEWSLETTER_SUBJECT.toLocaleString("en-IN")}
            </span>
          </span>
          <input
            value={subject}
            maxLength={MAX_NEWSLETTER_SUBJECT}
            placeholder="Required — inbox subject line"
            onChange={(event) =>
              onChange(
                compactSettings({
                  ...settings,
                  subject: event.target.value,
                }),
              )
            }
            className="mt-2 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-muted">
              Preview text
            </span>
            <span className="text-[11px] font-semibold text-muted">
              {preview.length.toLocaleString("en-IN")} /{" "}
              {MAX_NEWSLETTER_PREVIEW.toLocaleString("en-IN")}
            </span>
          </span>
          <input
            value={preview}
            maxLength={MAX_NEWSLETTER_PREVIEW}
            placeholder="Optional — inbox preview under the subject"
            onChange={(event) =>
              onChange(
                compactSettings({
                  ...settings,
                  preview: event.target.value,
                }),
              )
            }
            className="mt-2 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
          />
        </label>
      </div>
    );
  }

  const value = settings.layout ?? "images";
  const comment = settings.firstComment ?? "";
  return (
    <div className="space-y-4 border-t border-line px-4 py-3">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">
          LinkedIn layout
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {LINKEDIN_LAYOUT_OPTIONS.map((row) => (
            <Chip
              key={row.id}
              on={value === row.id}
              onClick={() =>
                onChange(
                  compactSettings({
                    ...settings,
                    layout: row.id === "images" ? undefined : (row.id as LinkedInLayout),
                  }),
                )
              }
            >
              {row.label}
            </Chip>
          ))}
        </div>
        {value === "carousel" ? (
          <p className="mt-2 text-[11px] font-semibold text-muted">
            {stillCount < 2
              ? "Add at least two photos for a carousel."
              : "Sends as a photo set for now. PDF carousels come later."}
          </p>
        ) : (
          <p className="mt-2 text-[11px] font-semibold text-muted">
            Multiple photos go out as a native image post.
          </p>
        )}
      </div>
      <div>
        <label className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wide text-muted">
            First comment
          </span>
          <span className="text-[11px] font-semibold text-muted">
            {comment.length.toLocaleString("en-IN")} /{" "}
            {MAX_FIRST_COMMENT.toLocaleString("en-IN")}
          </span>
        </label>
        <textarea
          value={comment}
          maxLength={MAX_FIRST_COMMENT}
          rows={3}
          placeholder="Optional — link, CTA, or extra context after the post goes live"
          onChange={(event) =>
            onChange(
              compactSettings({
                ...settings,
                firstComment: event.target.value,
              }),
            )
          }
          className="mt-2 w-full resize-none rounded-lg border border-line bg-background px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}

function compactSettings(value: ChannelSettings): ChannelSettings {
  const next: ChannelSettings = {};
  if (value.reply) next.reply = value.reply;
  if (value.layout) next.layout = value.layout;
  if (value.firstComment) next.firstComment = value.firstComment.slice(0, MAX_FIRST_COMMENT);
  if (value.subject) next.subject = value.subject.slice(0, MAX_NEWSLETTER_SUBJECT);
  if (value.preview) next.preview = value.preview.slice(0, MAX_NEWSLETTER_PREVIEW);
  return next;
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
        on ? "bg-accent text-accent-fg" : "text-muted hover:bg-background"
      }`}
    >
      {children}
    </button>
  );
}
