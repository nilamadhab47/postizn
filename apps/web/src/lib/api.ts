export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const isForm = typeof FormData !== "undefined" && init?.body instanceof FormData;
  if (!headers.has("Content-Type") && init?.body && !isForm) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) message = body.message.join(", ");
      else if (body.message) message = body.message;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export async function apiBlob(path: string): Promise<Blob> {
  const res = await fetch(`${API_URL}${path}`, { credentials: "include" });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) message = body.message.join(", ");
      else if (body.message) message = body.message;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message);
  }
  return res.blob();
}

export type AccessId = "FREE" | "TRIAL" | "PRO" | "STUDIO";

export type Me = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  plan: AccessId;
  timezone: string;
  createdAt?: string;
  emailVerified?: boolean;
  hasPassword?: boolean;
  logins?: {
    google: boolean;
    linkedin: boolean;
    twitter: boolean;
  };
  setup?: {
    channels: number;
    posts: number;
  };
  entitlements?: {
    plan: AccessId;
    access?: AccessId;
    billingExempt?: boolean;
    trialEndsAt?: string | null;
    trialDaysRemaining?: number | null;
    promoProEndsAt?: string | null;
    promoDaysRemaining?: number | null;
    channelLimit: number;
    postsPerDay?: number;
    postsToday?: number;
    postsTodayRemaining?: number | null;
    postsPerMonth: number | null;
    postsUsed?: number;
    postsRemaining?: number | null;
    imageCap: number | null;
    imageUsed?: number;
    imageRemaining?: number | null;
    aiCap?: number;
    aiUsed?: number;
    aiRemaining?: number | null;
    canUsePaidChannel?: boolean;
    freeChannels: string[];
    proChannels: string[];
  };
};

export const PROFILE_TIMEZONES = [
  { id: "Asia/Kolkata", label: "India (IST)" },
  { id: "Asia/Dubai", label: "Dubai (GST)" },
  { id: "Asia/Singapore", label: "Singapore (SGT)" },
  { id: "UTC", label: "UTC" },
  { id: "Europe/London", label: "London" },
  { id: "America/New_York", label: "New York" },
] as const;
