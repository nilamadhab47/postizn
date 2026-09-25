export type PlanId = "FREE" | "PRO";

export const FREE_CHANNEL_LIMIT = 2;
export const PRO_CHANNEL_LIMIT = 20;
export const FREE_POSTS_PER_MONTH = 30;
export const FREE_IMAGE_CAP = 3;

export const FREE_CHANNEL_LABELS = ["LinkedIn", "X"] as const;
export const PRO_CHANNEL_LABELS = [
  "LinkedIn Page",
  "Telegram",
  "Slack",
  "Discord",
  "Dev.to",
] as const;

export function channelLimit(plan: PlanId) {
  return plan === "PRO" ? PRO_CHANNEL_LIMIT : FREE_CHANNEL_LIMIT;
}

export function imageCap(plan: PlanId) {
  return plan === "PRO" ? null : FREE_IMAGE_CAP;
}

export function postsPerMonth(plan: PlanId) {
  return plan === "PRO" ? null : FREE_POSTS_PER_MONTH;
}

export function canUsePaidChannel(plan: PlanId) {
  return plan === "PRO";
}

export function entitlements(plan: PlanId) {
  return {
    plan,
    channelLimit: channelLimit(plan),
    postsPerMonth: postsPerMonth(plan),
    imageCap: imageCap(plan),
    freeChannels: [...FREE_CHANNEL_LABELS],
    proChannels: [...PRO_CHANNEL_LABELS],
  };
}
