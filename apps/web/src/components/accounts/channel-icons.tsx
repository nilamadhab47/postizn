type IconProps = { className?: string };

const FILES: Record<string, string> = {
  linkedin: "/channels/linkedin.png",
  "linkedin-page": "/channels/linkedin.png",
  twitter: "/channels/x.png",
  telegram: "/channels/telegram.png",
  slack: "/channels/slack.png",
  discord: "/channels/discord.png",
  medium: "/channels/medium.png",
  devto: "/channels/devto.png",
  instagram: "/channels/instagram.png",
  youtube: "/channels/youtube.png",
  gmb: "/channels/gmb.png",
  whatsapp: "/channels/whatsapp.png",
};

const LIGHT_PLATE = new Set(["twitter", "medium", "devto"]);

export function ChannelIcon({ slug, className }: { slug: string; className?: string }) {
  const src = FILES[slug] ?? FILES.linkedin;
  const light = LIGHT_PLATE.has(slug);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl ${className ?? "size-10"} ${light ? "bg-[#fff6e8] p-1" : "bg-transparent"}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="size-full object-contain" />
    </span>
  );
}

export function HelpIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "size-4"} aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.2.8-1.2 1.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.6" r="1" fill="currentColor" />
    </svg>
  );
}
