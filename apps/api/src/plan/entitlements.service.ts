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
import { MailService } from "../mail/mail.service";
import {
  AI_RATE_PER_HOUR,
  AI_RATE_PER_MINUTE,
  PAY_TO_USE,
  TRIAL_CHANNEL_LIMIT,
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
  Platform.NEWSLETTER,
];

export type AccessSnapshot = {
  access: AccessId;
  plan: PlanId;
  billingExempt: boolean;
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  promoProEndsAt: string | null;
  promoDaysRemaining: number | null;
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async resolve(userId: string): Promise<AccessSnapshot> {
    const user = await this.loadUser(userId);
    const ready = await this.ensureCounters(await this.closeTrialIfNeeded(user));
    await this.expirePromoIfNeeded(ready);
    await this.maybeRemindTrial(ready, new Date());
    return this.snapshot(ready);
  }

  async consumePost(userId: string) {
    const snap = await this.resolve(userId);
    this.assertWritable(snap);
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
    this.assertWritable(snap);
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
    this.assertWritable(snap);
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
    this.assertWritable(snap);
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

    if (snap.access === "TRIAL") {
      await this.pauseToTrial(userId);
    } else {
      await this.pauseAll(userId);
    }
    return snap;
  }

  async assertWritable(userIdOrSnap: string | AccessSnapshot) {
    const snap =
      typeof userIdOrSnap === "string" ? await this.resolve(userIdOrSnap) : userIdOrSnap;
    if (snap.access === "FREE") {
      throw new ForbiddenException(PAY_TO_USE);
    }
    return snap;
  }

  usableWhere() {
    return USABLE;
  }

  async sweepTrialMail() {
    const now = new Date();
    const lapsed = await this.prisma.user.findMany({
      where: {
        billingExempt: false,
        plan: { notIn: ["PRO", "STUDIO"] },
        trialClosedAt: null,
        trialEndsAt: { lte: now },
      },
    });
    for (const user of lapsed) {
      await this.closeTrialIfNeeded(user);
    }

    const open = await this.prisma.user.findMany({
      where: {
        billingExempt: false,
        plan: { notIn: ["PRO", "STUDIO"] },
        trialClosedAt: null,
        trialEndsAt: { gt: now },
      },
    });
    for (const user of open) {
      await this.maybeRemindTrial(user, now);
    }
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
    const promoDaysRemaining = promoDaysLeft(user.promoProEndsAt, access);
    return {
      access,
      plan: access === "STUDIO" || access === "PRO" ? access : "FREE",
      billingExempt: user.billingExempt,
      trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
      trialDaysRemaining,
      promoProEndsAt: user.promoProEndsAt?.toISOString() ?? null,
      promoDaysRemaining,
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

  private accessOf(
    user: Pick<User, "plan" | "billingExempt" | "trialEndsAt" | "promoProEndsAt">,
  ): AccessId {
    if (user.billingExempt) return "PRO";
    if (user.plan === "STUDIO") return "STUDIO";
    if (user.plan === "PRO") return "PRO";
    if (user.promoProEndsAt && user.promoProEndsAt.getTime() > Date.now()) return "PRO";
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

    const closed = await this.prisma.user.updateMany({
      where: {
        id: user.id,
        trialClosedAt: null,
        billingExempt: false,
        plan: { notIn: ["PRO", "STUDIO"] },
      },
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
    if (closed.count === 0) {
      return this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    }
    await this.pauseAll(user.id);
    const updated = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    this.mail.trialEnded(updated);
    return updated;
  }

  private async maybeRemindTrial(user: User, now: Date) {
    if (user.billingExempt || user.plan === "PRO" || user.plan === "STUDIO") return;
    if (user.trialClosedAt) return;
    if (!user.trialEndsAt || user.trialEndsAt.getTime() <= now.getTime()) return;

    const days = trialDaysLeft(user.trialEndsAt, "TRIAL");
    if (days == null) return;

    if (days <= 1 && !user.trialReminded1dAt) {
      const marked = await this.prisma.user.updateMany({
        where: { id: user.id, trialReminded1dAt: null },
        data: { trialReminded1dAt: now },
      });
      if (marked.count) this.mail.trialReminder(user, Math.max(1, days));
      return;
    }

    if (days <= 3 && days > 1 && !user.trialReminded3dAt) {
      const marked = await this.prisma.user.updateMany({
        where: { id: user.id, trialReminded3dAt: null },
        data: { trialReminded3dAt: now },
      });
      if (marked.count) this.mail.trialReminder(user, days);
    }
  }

  private async expirePromoIfNeeded(user: User) {
    if (user.billingExempt || user.plan === "PRO" || user.plan === "STUDIO") {
      return;
    }
    if (!user.promoProEndsAt || user.promoProEndsAt.getTime() > Date.now()) {
      return;
    }
    const access = this.accessOf(user);
    if (access === "TRIAL") {
      await this.pauseToTrial(user.id);
      return;
    }
    if (access === "FREE") {
      await this.pauseAll(user.id);
    }
  }

  private async pauseToTrial(userId: string) {
    await this.prisma.socialAccount.updateMany({
      where: { userId, platform: { in: PAID_PLATFORMS }, pausedByPlan: false },
      data: { pausedByPlan: true },
    });
    const live = await this.prisma.socialAccount.findMany({
      where: { userId, ...USABLE },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    const extra = live.slice(TRIAL_CHANNEL_LIMIT);
    if (extra.length) {
      await this.prisma.socialAccount.updateMany({
        where: { id: { in: extra.map((row) => row.id) } },
        data: { pausedByPlan: true },
      });
    }
  }

  private async pauseAll(userId: string) {
    await this.prisma.socialAccount.updateMany({
      where: { userId, pausedByPlan: false },
      data: { pausedByPlan: true },
    });
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

function promoDaysLeft(ends: Date | null, access: AccessId) {
  if (access !== "PRO" || !ends || ends.getTime() <= Date.now()) return null;
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
