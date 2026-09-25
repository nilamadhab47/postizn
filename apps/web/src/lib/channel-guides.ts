export type ChannelGuide = {
  steps: string[];
  links?: Array<{ label: string; href: string }>;
  note?: string;
};

export const CHANNEL_GUIDES: Record<string, ChannelGuide> = {
  linkedin: {
    steps: [
      "Click Connect. You leave postN and land on LinkedIn.",
      "Sign in if LinkedIn asks.",
      "Allow OpenID (name/email) and Share on LinkedIn (create posts).",
      "LinkedIn sends you back to Channels. Your name should show, not demo.",
    ],
    note: "Personal profile only. The LinkedIn app needs Sign In with LinkedIn using OpenID Connect plus Share on LinkedIn. Redirect URL: http://localhost:4000/social/callback/linkedin",
  },
  twitter: {
    steps: [
      "Click Connect. You leave postN and land on X.",
      "Sign in to the X account you want to post from.",
      "Allow tweet.read, tweet.write, and offline.access.",
      "X sends you back to Channels. Your handle should show, not demo-x.",
    ],
    note: "X needs pay-per-use credits or publish/connect can fail with 402.",
  },
  telegram: {
    steps: [
      "Open Telegram. Search @BotFather → Start → send /newbot.",
      "Pick a name (postN is fine) and a username that ends in bot.",
      "Copy the token BotFather sends (looks like 123456:ABC…).",
      "Create a channel (private is fine) or open an existing one.",
      "Channel → Administrators → Add the bot. Turn on Post messages.",
      "If the channel has a public link, paste t.me/yourchannel or @yourchannel. Private channels need the -100… id.",
      "Paste token + channel in this form → Connect → Test post. Do not paste BotFather as the channel.",
    ],
    links: [{ label: "Telegram BotFather", href: "https://t.me/BotFather" }],
    note: "Test post goes live in that channel. Use a private test channel.",
  },
  slack: {
    steps: [
      "Open api.slack.com/apps → Create New App → From scratch.",
      "Name it postN and pick your workspace.",
      "OAuth & Permissions → Bot Token Scopes → add chat:write.",
      "Install to Workspace → Allow.",
      "Copy Bot User OAuth Token (starts with xoxb-).",
      "In Slack, make a #postn-test channel. Invite the bot (/invite @postN).",
      "Channel name → View channel details → copy Channel ID (C0… or G0…).",
      "Paste token + channel ID here → Connect → Test post.",
    ],
    links: [{ label: "Slack API apps", href: "https://api.slack.com/apps" }],
    note: "The message posts into that Slack channel.",
  },
  discord: {
    steps: [
      "Open Discord. Use a test server, or create one.",
      "Create a text channel, e.g. #postn-test.",
      "Channel settings (gear) → Integrations → Webhooks → New Webhook.",
      "Copy Webhook URL (starts with https://discord.com/api/webhooks/).",
      "Paste it here → Connect → Test post.",
    ],
    note: "The test shows up as a webhook message in that channel.",
  },
  medium: {
    steps: [
      "Medium closed new API integrations and no longer mints integration tokens.",
      "Existing old tokens still work on Medium’s side, but postN will not add new Medium connects.",
      "Publish on Medium in the browser or app, or import a public URL there.",
    ],
    links: [{ label: "Medium", href: "https://medium.com" }],
    note: "This is a Medium product decision, not a postN outage.",
  },
  devto: {
    steps: [
      "Sign in at dev.to.",
      "Open Settings → Extensions.",
      "Under DEV API Keys, generate a key named postN.",
      "Paste it here → Connect → Test post.",
    ],
    links: [
      { label: "Dev.to extensions", href: "https://dev.to/settings/extensions" },
    ],
    note: "Test creates an unpublished article.",
  },
  "linkedin-page": {
    steps: [
      "This is a company Page, not your personal profile. Stay an admin of the Page.",
      "In the LinkedIn developer app, add the Community Management API product.",
      "Auth → redirect URLs → add http://localhost:4000/social/callback/linkedin-page",
      "Click Connect. Approve posting as the organization.",
      "If you admin more than one Page, we attach the first one LinkedIn returns.",
      "Channels should show the Page name. Then Test post.",
    ],
    links: [
      {
        label: "LinkedIn developer apps",
        href: "https://www.linkedin.com/developers/apps",
      },
    ],
    note: "Same app keys as personal LinkedIn. Page posting is a separate LinkedIn product.",
  },
  instagram: {
    steps: [
      "Instagram only works with a Professional account (Business or Creator).",
      "Meta App Review is required before other people’s accounts can connect.",
      "This stays last on the roadmap.",
    ],
  },
  youtube: {
    steps: [
      "YouTube uses Google OAuth for the channel you manage.",
      "We’ll wire it after Telegram and the publish engine.",
    ],
  },
  gmb: {
    steps: [
      "Google Business Profile posts for a verified location.",
      "Needs a Google Cloud project and the Business Profile APIs.",
    ],
  },
  whatsapp: {
    steps: [
      "WhatsApp Cloud API is for template messages to customers, not a public feed.",
      "postN will not treat it like LinkedIn or X. Later, if we do CRM-style sends.",
    ],
  },
};
