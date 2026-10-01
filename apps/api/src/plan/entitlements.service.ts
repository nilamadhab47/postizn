import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Platform, type User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  AI_RATE_PER_HOUR,
  AI_RATE_PER_MINUTE,
  FREE_CHANNEL_LIMIT,
  capsFor,
  entitlements as catalogEntitlements,
  type AccessId,
  type PlanId,
} from "./entitlements";

const PAID_PLATFORMS: Platform[] = [
  Platform.LINKEDIN_PAGE,
  Platform.TELEGRAM,
  Platform.MEDIUM,
  Platform.DEVTO,
  Platform.SLACK,
  Platform.DISCORD,
];

export type AccessSnapshot = {
  access: AccessId;
  plan: PlanId;
  billingExempt: boolean;
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  channelLimit: number;
  postsPerDay: number;
  postsToday: number;
  postsTodayRemaining: number;
  postsPerMonth: number;
  postsUsed: number;
  postsRemaining: number;
  imageCap: number;
  imageUsed: number;
  imageRemaining: number;
  aiCap: number;
  aiUsed: number;
  aiRemaining: number;
  canUsePaidChannel: boolean;
  freeChannels: string[];
  proChannels: string[];
};

const USABLE = { isActive: true, pausedByPlan: false } as const;

@Injectable()
export class EntitlementsService {
  private readonly aiHits = new Map<string, number[]>();

  constructor(private readonly prisma: PrismaService) {}

  async resolve(userId: string): Promise<AccessSnapshot> {
    const user = await this.loadUser(userId);
    const ready = await this.ensureCounters(await this.closeTrialIfNeeded(user));
    return this.snapshot(ready);
  }

  async consumePost(userId: string) {
    const snap = await this.resolve(userId);
    if (snap.postsTodayRemaining <= 0) {
      throw new ForbiddenException(
        `${label(snap.access)} includes ${snap.postsPerDay} posts today (IST).`,
      );
    }
    if (snap.postsRemaining <= 0) {
      throw new ForbiddenException(this.periodPostMessage(snap));
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { postsThisMonth: { increment: 1 }, postsToday: { increment: 1 } },
    });
  }

  async refundPost(userId: string) {
    await this.prisma.user.updateMany({
      where: { id: userId, postsThisMonth: { gt: 0 } },
      data: { postsThisMonth: { decrement: 1 } },
    });
    await this.prisma.user.updateMany({
      where: { id: userId, postsToday: { gt: 0 } },
      data: { postsToday: { decrement: 1 } },
    });
  }

  async consumeImage(userId: string) {
    this.assertComposeRate(userId);
    const snap = await this.resolve(userId);
    if (snap.imageRemaining <= 0) {
      throw new BadRequestException(
        `${label(snap.access)} includes ${snap.imageCap} image gens. Upgrade for more.`,
      );
    }
    const next = await this.prisma.user.update({
      where: { id: userId },
      data: { imageGensUsed: { increment: 1 } },
      select: { imageGensUsed: true },
    });
    return {
      cap: snap.imageCap,
      remaining: Math.max(0, snap.imageCap - next.imageGensUsed),
    };
  }

  async consumeAi(userId: string) {
    const snap = await this.resolve(userId);
    if (snap.aiRemaining <= 0) {
      throw new ForbiddenException(
        `${label(snap.access)} includes ${snap.aiCap} AI writes. Upgrade for more.`,
      );
    }
    const next = await this.prisma.user.update({
      where: { id: userId },
      data: { aiCallsUsed: { increment: 1 } },
      select: { aiCallsUsed: true },
    });
    return {
      cap: snap.aiCap,
      remaining: Math.max(0, snap.aiCap - next.aiCallsUsed),
    };
  }

  async assertAi(userId: string) {
    this.assertComposeRate(userId);
    const snap = await this.resolve(userId);
    if (snap.aiRemaining <= 0) {
      throw new ForbiddenException(
        `${label(snap.access)} includes ${snap.aiCap} AI writes. Upgrade for more.`,
      );
    }
    return snap;
  }

  async imageStatus(userId: string) {
    const snap = await this.resolve(userId);
    return {
      plan: snap.access,
      cap: snap.imageCap,
      remaining: snap.imageRemaining,
      aiCap: snap.aiCap,
      aiRemaining: snap.aiRemaining,
      postsTodayRemaining: snap.postsTodayRemaining,
      postsRemaining: snap.postsRemaining,
      trialDaysRemaining: snap.trialDaysRemaining,
    };
  }

  async syncChannelAccess(userId: string) {
    const snap = await this.resolve(userId);
    if (snap.canUsePaidChannel) {
      await this.prisma.socialAccount.updateMany({
        where: { userId, pausedByPlan: true },
        data: { pausedByPlan: false },
      });
      const live = await this.prisma.socialAccount.findMany({
        where: { userId, ...USABLE },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      const extra = live.slice(snap.channelLimit);
      if (extra.length) {
        await this.prisma.socialAccount.updateMany({
          where: { id: { in: extra.map((row) => row.id) } },
          data: { pausedByPlan: true },
        });
      }
      return snap;
    }

    await this.pauseToFree(userId);
    return snap;
  }

  usableWhere() {
    return USABLE;
  }

  private assertComposeRate(userId: string) {
    const now = Date.now();
    const hits = (this.aiHits.get(userId) ?? []).filter((at) => now - at < 60 * 60 * 1000);
    const lastMinute = hits.filter((at) => now - at < 60 * 1000);
    if (lastMinute.length >= AI_RATE_PER_MINUTE) {
      throw new HttpException("Slow down — try AI again in a minute.", HttpStatus.TOO_MANY_REQUESTS);
    }
    if (hits.length >= AI_RATE_PER_HOUR) {
      throw new HttpException("Hourly AI limit reached. Try again later.", HttpStatus.TOO_MANY_REQUESTS);
    }
    hits.push(now);
    this.aiHits.set(userId, hits);
  }

  private snapshot(user: User): AccessSnapshot {
    const access = this.accessOf(user);
    const caps = capsFor(access, user.billingExempt);
    const catalog = catalogEntitlements(access, user.billingExempt);
    const trialDaysRemaining = trialDaysLeft(user.trialEndsAt, access);
    return {
      access,
      plan: access === "STUDIO" || access === "PRO" ? access : "FREE",
      billingExempt: user.billingExempt,
      trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
      trialDaysRemaining,
      channelLimit: caps.channelLimit,
      postsPerDay: caps.postsPerDay,
      postsToday: user.postsToday,
      postsTodayRemaining: Math.max(0, caps.postsPerDay - user.postsToday),
      postsPerMonth: caps.postsPerMonth,
      postsUsed: user.postsThisMonth,
      postsRemaining: Math.max(0, caps.postsPerMonth - user.postsThisMonth),
      imageCap: caps.imageCap,
      imageUsed: user.imageGensUsed,
      imageRemaining: Math.max(0, caps.imageCap - user.imageGensUsed),
      aiCap: caps.aiCap,
      aiUsed: user.aiCallsUsed,
      aiRemaining: Math.max(0, caps.aiCap - user.aiCallsUsed),
      canUsePaidChannel: caps.canUsePaidChannel,
      freeChannels: catalog.freeChannels,
      proChannels: catalog.proChannels,
    };
  }

  private accessOf(user: Pick<User, "plan" | "billingExempt" | "trialEndsAt">): AccessId {
    if (user.billingExempt) return "PRO";
    if (user.plan === "STUDIO") return "STUDIO";
    if (user.plan === "PRO") return "PRO";
    if (user.trialEndsAt && user.trialEndsAt.getTime() > Date.now()) return "TRIAL";
    return "FREE";
  }

  private async loadUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  private async closeTrialIfNeeded(user: User) {
    if (user.billingExempt || user.plan === "PRO" || user.plan === "STUDIO") return user;
    if (!user.trialEndsAt || user.trialEndsAt.getTime() > Date.now()) return user;
    if (user.trialClosedAt) return user;

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        trialClosedAt: new Date(),
        postsThisMonth: 0,
        postsToday: 0,
        imageGensUsed: 0,
        aiCallsUsed: 0,
        postsResetAt: istMonthStart(),
        postsTodayResetAt: istDayStart(),
      },
    });
    await this.pauseToFree(user.id);
    return updated;
  }

  private async pauseToFree(userId: string) {
    await this.prisma.socialAccount.updateMany({
      where: { userId, platform: { in: PAID_PLATFORMS }, pausedByPlan: false },
      data: { pausedByPlan: true },
    });
    const live = await this.prisma.socialAccount.findMany({
      where: { userId, ...USABLE },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    const extra = live.slice(FREE_CHANNEL_LIMIT);
    if (extra.length) {
      await this.prisma.socialAccount.updateMany({
        where: { id: { in: extra.map((row) => row.id) } },
        data: { pausedByPlan: true },
      });
    }
  }

  private async ensureCounters(user: User) {
    const dayStart = istDayStart();
    const monthStart = istMonthStart();
    const access = this.accessOf(user);
    const data: {
      postsToday?: number;
      postsTodayResetAt?: Date;
      postsThisMonth?: number;
      imageGensUsed?: number;
      aiCallsUsed?: number;
      postsResetAt?: Date;
    } = {};

    if (!user.postsTodayResetAt || user.postsTodayResetAt.getTime() < dayStart.getTime()) {
      data.postsToday = 0;
      data.postsTodayResetAt = dayStart;
    }

    if (access !== "TRIAL") {
      if (!user.postsResetAt || user.postsResetAt.getTime() < monthStart.getTime()) {
        data.postsThisMonth = 0;
        data.imageGensUsed = 0;
        data.aiCallsUsed = 0;
        data.postsResetAt = monthStart;
      }
    }

    if (Object.keys(data).length === 0) return user;
    return this.prisma.user.update({ where: { id: user.id }, data });
  }

  private periodPostMessage(snap: AccessSnapshot) {
    if (snap.access === "TRIAL") {
      return `Trial includes ${snap.postsPerMonth} posts. Upgrade to Pro for more.`;
    }
    return `${label(snap.access)} includes ${snap.postsPerMonth} posts this month (IST).`;
  }
}

function label(access: AccessId) {
  if (access === "TRIAL") return "Trial";
  if (access === "PRO") return "Pro";
  if (access === "STUDIO") return "Studio";
  return "This account";
}

function trialDaysLeft(ends: Date | null, access: AccessId) {
  if (access !== "TRIAL" || !ends) return null;
  return Math.max(0, Math.ceil((ends.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

function istMonthStart(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return new Date(`${year}-${month}-01T00:00:00+05:30`);
}

function istDayStart(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return new Date(`${year}-${month}-${day}T00:00:00+05:30`);
}
