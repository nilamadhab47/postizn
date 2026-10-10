export type AccessId = "FREE" | "TRIAL" | "PRO" | "STUDIO";
export type PlanId = "FREE" | "PRO" | "STUDIO";

export const TRIAL_DAYS = 14;
export const TRIAL_EXTENDED_DAYS = 30;
export const PROMO_PRO_DAYS = 14;

export const FREE_CHANNEL_LIMIT = 0;
export const TRIAL_CHANNEL_LIMIT = 2;
export const PRO_CHANNEL_LIMIT = 10;
export const EXEMPT_CHANNEL_LIMIT = 20;

export const FREE_POSTS_PER_DAY = 0;
export const TRIAL_POSTS_PER_DAY = 2;
export const PRO_POSTS_PER_DAY = 8;

export const FREE_POSTS_PER_MONTH = 0;
export const TRIAL_POSTS_CAP = 20;
export const PRO_POSTS_PER_MONTH = 150;

export const FREE_IMAGE_CAP = 0;
export const TRIAL_IMAGE_CAP = 3;
export const PRO_IMAGE_CAP = 20;

export const FREE_AI_CAP = 0;
export const TRIAL_AI_CAP = 8;
export const PRO_AI_CAP = 40;

export const STUDIO_CHANNEL_LIMIT = 10;
export const STUDIO_POSTS_PER_DAY = 20;
export const STUDIO_POSTS_PER_MONTH = 400;
export const STUDIO_IMAGE_CAP = 80;
export const STUDIO_AI_CAP = 150;

export const AI_RATE_PER_MINUTE = 10;
export const AI_RATE_PER_HOUR = 60;

/** Lapsed trial — browse the app, pay to post / connect / generate. */
export const PAY_TO_USE = "Trial ended. Pay to use.";

export const FREE_CHANNEL_LABELS = ["LinkedIn", "X"] as const;
export const PRO_CHANNEL_LABELS = [
  "LinkedIn Page",
  "Telegram",
  "Slack",
  "Discord",
  "Dev.to",
  "Newsletter",
] as const;

export type AccessCaps = {
  channelLimit: number;
  postsPerDay: number;
  postsPerMonth: number;
  imageCap: number;
  aiCap: number;
  canUsePaidChannel: boolean;
};

const CAPS: Record<AccessId, AccessCaps> = {
  FREE: {
    channelLimit: FREE_CHANNEL_LIMIT,
    postsPerDay: FREE_POSTS_PER_DAY,
    postsPerMonth: FREE_POSTS_PER_MONTH,
    imageCap: FREE_IMAGE_CAP,
    aiCap: FREE_AI_CAP,
    canUsePaidChannel: false,
  },
  TRIAL: {
    channelLimit: TRIAL_CHANNEL_LIMIT,
    postsPerDay: TRIAL_POSTS_PER_DAY,
    postsPerMonth: TRIAL_POSTS_CAP,
    imageCap: TRIAL_IMAGE_CAP,
    aiCap: TRIAL_AI_CAP,
    canUsePaidChannel: false,
  },
  PRO: {
    channelLimit: PRO_CHANNEL_LIMIT,
    postsPerDay: PRO_POSTS_PER_DAY,
    postsPerMonth: PRO_POSTS_PER_MONTH,
    imageCap: PRO_IMAGE_CAP,
    aiCap: PRO_AI_CAP,
    canUsePaidChannel: true,
  },
  STUDIO: {
    channelLimit: STUDIO_CHANNEL_LIMIT,
    postsPerDay: STUDIO_POSTS_PER_DAY,
    postsPerMonth: STUDIO_POSTS_PER_MONTH,
    imageCap: STUDIO_IMAGE_CAP,
    aiCap: STUDIO_AI_CAP,
    canUsePaidChannel: true,
  },
};

export function capsFor(access: AccessId, billingExempt = false): AccessCaps {
  const base = CAPS[access];
  if (billingExempt) {
    return { ...CAPS.PRO, channelLimit: EXEMPT_CHANNEL_LIMIT };
  }
  return base;
}

export function channelLimit(access: AccessId, billingExempt = false) {
  return capsFor(access, billingExempt).channelLimit;
}

export function imageCap(access: AccessId, billingExempt = false) {
  return capsFor(access, billingExempt).imageCap;
}

export function postsPerMonth(access: AccessId, billingExempt = false) {
  return capsFor(access, billingExempt).postsPerMonth;
}

export function postsPerDay(access: AccessId, billingExempt = false) {
  return capsFor(access, billingExempt).postsPerDay;
}

export function aiCap(access: AccessId, billingExempt = false) {
  return capsFor(access, billingExempt).aiCap;
}

export function canUsePaidChannel(access: AccessId) {
  return capsFor(access).canUsePaidChannel;
}

export function entitlements(access: AccessId, billingExempt = false) {
  const caps = capsFor(access, billingExempt);
  return {
    plan: access,
    channelLimit: caps.channelLimit,
    postsPerMonth: caps.postsPerMonth,
    postsPerDay: caps.postsPerDay,
    imageCap: caps.imageCap,
    aiCap: caps.aiCap,
    freeChannels: [...FREE_CHANNEL_LABELS],
    proChannels: [...PRO_CHANNEL_LABELS],
  };
}

export function trialStartData(now = new Date()) {
  return {
    trialStartedAt: now,
    trialEndsAt: new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
    trialUsed: true,
    postsThisMonth: 0,
    postsToday: 0,
    imageGensUsed: 0,
    aiCallsUsed: 0,
  };
}
