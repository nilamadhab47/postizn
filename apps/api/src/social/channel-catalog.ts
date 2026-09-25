export type ChannelPlan = "FREE" | "PRO";
export type ConnectMode = "oauth" | "token" | "soon" | "gone";

export type TokenField = {
  name: string;
  label: string;
  placeholder?: string;
  hint?: string;
  secret?: boolean;
};

export const SOON_CHANNELS: Array<{
  slug: string;
  label: string;
  plan: ChannelPlan;
  blurb: string;
}> = [
  {
    slug: "instagram",
    label: "Instagram",
    plan: "PRO",
    blurb: "Professional accounts. Meta review for other people.",
  },
  {
    slug: "youtube",
    label: "YouTube",
    plan: "PRO",
    blurb: "Community posts and uploads later.",
  },
  {
    slug: "gmb",
    label: "Google Business",
    plan: "PRO",
    blurb: "Local posts for D2C storefronts.",
  },
  {
    slug: "whatsapp",
    label: "WhatsApp",
    plan: "PRO",
    blurb: "Templates and CRM, not a public feed.",
  },
];

export const GONE_CHANNELS: Array<{
  slug: string;
  label: string;
  plan: ChannelPlan;
  blurb: string;
}> = [
  {
    slug: "medium",
    label: "Medium",
    plan: "PRO",
    blurb: "Medium stopped new integration tokens. Publish on Medium directly.",
  },
];
