"use client";

import {
  LINKEDIN_LAYOUT_OPTIONS,
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
                  row.id === "everyone" ? {} : { reply: row.id as XReplySetting },
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

  const value = settings.layout ?? "images";
  return (
    <div className="border-t border-line px-4 py-3">
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
                row.id === "images"
                  ? {}
                  : { layout: row.id as LinkedInLayout },
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
  );
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
