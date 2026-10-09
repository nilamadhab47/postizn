import type { Platform } from "@prisma/client";

export type PublicAccountRow = {
  id: string;
  platform: Platform;
  platformId: string;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
  isActive: boolean;
  isMock?: boolean;
  pausedByPlan?: boolean;
  accessToken?: string;
  refreshToken?: string | null;
};

export function publicAccount(row: PublicAccountRow) {
  return {
    id: row.id,
    platform: row.platform,
    platformId: row.platformId,
    username: row.username,
    displayName: row.displayName,
    avatar: row.avatar,
    isActive: row.isActive,
    isMock: Boolean(row.isMock),
    pausedByPlan: Boolean(row.pausedByPlan),
  };
}
