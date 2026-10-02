const ONBOARD_PREFIX = "postn:onboard:";
const PLAN_PREFIX = "postn:plan-welcome:";

function read(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

export function hasFinishedOnboarding(userId: string) {
  return read(`${ONBOARD_PREFIX}${userId}`) === "done";
}

export function finishOnboarding(userId: string) {
  write(`${ONBOARD_PREFIX}${userId}`, "done");
  try {
    sessionStorage.removeItem("postn:fresh-account");
  } catch {
    /* ignore */
  }
}

export function hasSeenPlanWelcome(userId: string, plan: string) {
  return read(`${PLAN_PREFIX}${userId}:${plan}`) === "done";
}

export function finishPlanWelcome(userId: string, plan: string) {
  write(`${PLAN_PREFIX}${userId}:${plan}`, "done");
}

export const PLAN_WELCOME_EVENT = "postn:plan-welcome";
