import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  forwardRef,
} from "@nestjs/common";
import { Platform, PostStatus, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import {
  PLATFORM_CHAR_LIMITS,
  mediaBundleError,
  platformCharCount,
  type Platform as SharedPlatform,
} from "@postn/shared";
import { PrismaService } from "../prisma/prisma.service";
import { SocialService } from "../social/social.service";
import { MediaService } from "../media/media.service";
import { PublishQueue } from "../queue/publish.queue";
import { NotificationsService } from "../notifications/notifications.service";
import { EntitlementsService } from "../plan/entitlements.service";
import { channelLabel } from "./channel-label";
import { publicPublishError } from "./publish-error";

const LIVE_PLATFORMS = new Set<Platform>([
  Platform.TWITTER,
  Platform.LINKEDIN,
  Platform.LINKEDIN_PAGE,
  Platform.TELEGRAM,
  Platform.DEVTO,
  Platform.SLACK,
  Platform.DISCORD,
]);

export type PostAction = "draft" | "schedule" | "now";

export type CreatePostInput = {
  action?: string;
  content?: string;
  contentByPlatform?: Record<string, string>;
  platforms?: string[];
  scheduledAt?: string | null;
  mediaUrls?: string[];
};

export type UpdatePostInput = CreatePostInput;

@Injectable()
export class PostsService {
  private readonly log = new Logger(PostsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly social: SocialService,
    private readonly media: MediaService,
    @Inject(forwardRef(() => PublishQueue))
    private readonly publishQueue: PublishQueue,
    private readonly notifications: NotificationsService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async create(userId: string, input: CreatePostInput) {
    const action = this.parseAction(input.action);
    const content = (input.content ?? "").trim();
    const platforms = this.parsePlatforms(input.platforms);
    const overrides = this.cleanOverrides(content, input.contentByPlatform);
    const scheduledAt = this.parseSchedule(action, input.scheduledAt);
    const media = await this.media.ownedForUser(
      userId,
      (input.mediaUrls ?? []).filter((url) => typeof url === "string"),
    );
    const mediaUrls = media.map((item) => item.url);
    if (action !== "draft") {
      const mediaError = mediaBundleError(media, platforms);
      if (mediaError) throw new BadRequestException(mediaError);
    }

    if (action !== "draft" && !content && !Object.keys(overrides).length && !mediaUrls.length) {
      throw new BadRequestException("Write something or attach a file before sending");
    }
    if (action === "draft" && !content && !Object.keys(overrides).length && !mediaUrls.length) {
      throw new BadRequestException("Draft is empty");
    }

    const byPlatform = await this.requireLiveAccounts(userId, platforms);

    for (const platform of platforms) {
      const body = (overrides[platform] ?? content).trim();
      if (action !== "draft" && !body && !mediaUrls.length) {
        throw new BadRequestException(`${channelLabel(platform)} has no text`);
      }
      const limit = PLATFORM_CHAR_LIMITS[platform as SharedPlatform];
      if (limit && platformCharCount(platform as SharedPlatform, body) > limit) {
        throw new BadRequestException(
          `${channelLabel(platform)} is over ${limit.toLocaleString("en-IN")} characters`,
        );
      }
    }

    const postStatus =
      action === "draft"
        ? PostStatus.DRAFT
        : action === "schedule"
          ? PostStatus.SCHEDULED
          : PostStatus.PUBLISHING;
    const targetStatus =
      action === "now" ? PostStatus.PUBLISHING : postStatus;

    const post = await this.prisma.post.create({
      data: {
        userId,
        content: content || Object.values(overrides)[0] || "",
        contentByPlatform: Object.keys(overrides).length
          ? (overrides as Prisma.InputJsonValue)
          : undefined,
        status: postStatus,
        scheduledAt,
        mediaUrls,
        targets: {
          create: platforms.map((platform) => {
            const account = byPlatform.get(platform)!;
            return {
              socialAccountId: account.id,
              status: targetStatus,
              idempotencyKey: randomUUID(),
            };
          }),
        },
      },
      include: { targets: { include: { socialAccount: true } } },
    });

    if (action === "schedule" || action === "now") {
      try {
        await this.entitlements.consumePost(userId);
      } catch (err) {
        await this.prisma.post.delete({ where: { id: post.id } });
        throw err;
      }
    }

    if (action === "schedule") {
      try {
        await this.publishQueue.enqueue(post.id, scheduledAt!);
      } catch (err) {
        await this.prisma.post.delete({ where: { id: post.id } });
        await this.entitlements.refundPost(userId);
        const message = err instanceof Error ? err.message : "queue failed";
        this.log.warn(`could not enqueue ${post.id}: ${message}`);
        throw new ServiceUnavailableException(
          "Scheduler is not reachable. Is Redis running on 6381?",
        );
      }
      return this.get(userId, post.id);
    }

    if (action !== "now") {
      return this.present(post);
    }

    return this.publishDue(post.id, { retryFailed: false });
  }

  async reschedule(userId: string, id: string, raw?: string) {
    const post = await this.prisma.post.findFirst({
      where: { id, userId },
    });
    if (!post) throw new NotFoundException("Post not found");
    if (post.status !== PostStatus.SCHEDULED) {
      throw new BadRequestException("Only queued posts can be moved");
    }
    const scheduledAt = this.parseSchedule("schedule", raw);
    if (!scheduledAt) {
      throw new BadRequestException("Pick an IST time to schedule");
    }
    if (post.scheduledAt && post.scheduledAt.getTime() === scheduledAt.getTime()) {
      return this.get(userId, id);
    }
    const previous = post.scheduledAt;
    await this.prisma.post.update({
      where: { id },
      data: { scheduledAt },
    });
    try {
      await this.publishQueue.enqueue(id, scheduledAt);
    } catch (err) {
      await this.prisma.post.update({
        where: { id },
        data: { scheduledAt: previous },
      });
      if (previous) {
        try {
          await this.publishQueue.enqueue(id, previous);
        } catch {
          /* original job may still be on the queue */
        }
      }
      const message = err instanceof Error ? err.message : "queue failed";
      this.log.warn(`could not reschedule ${id}: ${message}`);
      throw new ServiceUnavailableException(
        "Scheduler is not reachable. Is Redis running on 6381?",
      );
    }
    return this.get(userId, id);
  }

  async update(userId: string, id: string, input: UpdatePostInput) {
    const timeOnly =
      input.scheduledAt !== undefined &&
      input.action == null &&
      input.content == null &&
      input.contentByPlatform == null &&
      input.platforms == null &&
      input.mediaUrls == null;
    if (timeOnly) {
      return this.reschedule(userId, id, input.scheduledAt ?? undefined);
    }

    const existing = await this.prisma.post.findFirst({
      where: { id, userId },
      include: { targets: { include: { socialAccount: true } } },
    });
    if (!existing) throw new NotFoundException("Post not found");
    if (existing.status === PostStatus.PUBLISHING) {
      throw new BadRequestException("That post is sending. Try again in a moment");
    }
    const hasFailedTarget = existing.targets.some(
      (target) => target.status === PostStatus.FAILED,
    );
    if (existing.status === PostStatus.PUBLISHED && !hasFailedTarget) {
      throw new BadRequestException(
        "That post already went out. Duplicate it from Compose",
      );
    }

    const action = input.action ? this.parseAction(input.action) : "keep";
    const content =
      input.content !== undefined ? input.content.trim() : existing.content;
    const platforms = input.platforms?.length
      ? this.parsePlatforms(input.platforms)
      : existing.targets.map((target) => target.socialAccount.platform);
    const overrides = this.cleanOverrides(content, input.contentByPlatform);
    const media = await this.media.ownedForUser(
      userId,
      (input.mediaUrls ?? existing.mediaUrls).filter(
        (url) => typeof url === "string",
      ),
    );
    const mediaUrls = media.map((item) => item.url);
    const effectiveAction: PostAction =
      action === "keep"
        ? existing.status === PostStatus.SCHEDULED
          ? "schedule"
          : existing.status === PostStatus.DRAFT
            ? "draft"
            : "now"
        : action;

    if (effectiveAction !== "draft") {
      const mediaError = mediaBundleError(media, platforms);
      if (mediaError) throw new BadRequestException(mediaError);
    }
    if (
      effectiveAction !== "draft" &&
      !content &&
      !Object.keys(overrides).length &&
      !mediaUrls.length
    ) {
      throw new BadRequestException(
        "Write something or attach a file before sending",
      );
    }
    if (
      effectiveAction === "draft" &&
      !content &&
      !Object.keys(overrides).length &&
      !mediaUrls.length
    ) {
      throw new BadRequestException("Draft is empty");
    }

    const byPlatform = await this.requireLiveAccounts(userId, platforms);
    for (const platform of platforms) {
      const body = (overrides[platform] ?? content).trim();
      if (effectiveAction !== "draft" && !body && !mediaUrls.length) {
        throw new BadRequestException(`${channelLabel(platform)} has no text`);
      }
      const limit = PLATFORM_CHAR_LIMITS[platform as SharedPlatform];
      if (limit && platformCharCount(platform as SharedPlatform, body) > limit) {
        throw new BadRequestException(
          `${channelLabel(platform)} is over ${limit.toLocaleString("en-IN")} characters`,
        );
      }
    }

    const unpublishedStatus =
      effectiveAction === "draft"
        ? PostStatus.DRAFT
        : effectiveAction === "schedule"
          ? PostStatus.SCHEDULED
          : PostStatus.PUBLISHING;
    const scheduledAt =
      effectiveAction === "now"
        ? new Date()
        : effectiveAction === "draft"
          ? input.scheduledAt !== undefined
            ? this.parseSchedule("draft", input.scheduledAt)
            : existing.scheduledAt
          : this.parseSchedule(
              "schedule",
              input.scheduledAt ?? existing.scheduledAt?.toISOString() ?? null,
            );

    const charging =
      existing.status === PostStatus.DRAFT &&
      (effectiveAction === "schedule" || effectiveAction === "now");
    if (charging) {
      await this.entitlements.consumePost(userId);
    }

    const postStatus =
      effectiveAction === "draft"
        ? PostStatus.DRAFT
        : effectiveAction === "schedule"
          ? PostStatus.SCHEDULED
          : PostStatus.PUBLISHING;

    try {
      await this.syncTargets(existing, platforms, byPlatform, unpublishedStatus);
      await this.prisma.post.update({
        where: { id },
        data: {
          content: content || Object.values(overrides)[0] || "",
          contentByPlatform: Object.keys(overrides).length
            ? (overrides as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          mediaUrls,
          status: postStatus,
          scheduledAt,
          failedReason: effectiveAction === "now" ? null : existing.failedReason,
        },
      });
    } catch (err) {
      if (charging) await this.entitlements.refundPost(userId);
      throw err;
    }

    if (effectiveAction === "schedule") {
      try {
        await this.publishQueue.enqueue(id, scheduledAt!);
      } catch (err) {
        const message = err instanceof Error ? err.message : "queue failed";
        this.log.warn(`could not update queue for ${id}: ${message}`);
        throw new ServiceUnavailableException(
          "Scheduler is not reachable. Is Redis running on 6381?",
        );
      }
      return this.get(userId, id);
    }

    await this.publishQueue.remove(id);
    if (effectiveAction === "draft") {
      await this.prisma.post.update({ where: { id }, data: { jobId: null } });
      return this.get(userId, id);
    }
    return this.publishDue(id, { retryFailed: false });
  }

  async cancel(userId: string, id: string) {
    const post = await this.prisma.post.findFirst({ where: { id, userId } });
    if (!post) throw new NotFoundException("Post not found");
    if (post.status !== PostStatus.SCHEDULED) {
      throw new BadRequestException("Only queued posts can be cancelled");
    }
    await this.publishQueue.remove(id);
    await this.prisma.postTarget.updateMany({
      where: { postId: id, status: { not: PostStatus.PUBLISHED } },
      data: { status: PostStatus.DRAFT },
    });
    await this.prisma.post.update({
      where: { id },
      data: { status: PostStatus.DRAFT, jobId: null },
    });
    await this.entitlements.refundPost(userId);
    return this.get(userId, id);
  }

  async remove(userId: string, id: string) {
    const post = await this.prisma.post.findFirst({ where: { id, userId } });
    if (!post) throw new NotFoundException("Post not found");
    if (post.status === PostStatus.PUBLISHING) {
      throw new BadRequestException(
        "That post is sending. Try again in a moment",
      );
    }
    await this.publishQueue.remove(id);
    await this.prisma.post.delete({ where: { id } });
    if (post.status === PostStatus.SCHEDULED) {
      await this.entitlements.refundPost(userId);
    }
    return { ok: true };
  }

  async retry(userId: string, id: string, platform?: string) {
    const post = await this.prisma.post.findFirst({
      where: { id, userId },
      include: { targets: { include: { socialAccount: true } } },
    });
    if (!post) throw new NotFoundException("Post not found");
    const wanted = platform?.trim().toUpperCase();
    const failed = post.targets.filter(
      (target) =>
        target.status === PostStatus.FAILED &&
        !target.platformPostId &&
        (!wanted || target.socialAccount.platform === wanted),
    );
    if (!failed.length) {
      throw new BadRequestException("Nothing failed on that post to retry");
    }
    await this.prisma.postTarget.updateMany({
      where: { id: { in: failed.map((row) => row.id) } },
      data: { status: PostStatus.PUBLISHING, failedReason: null },
    });
    await this.prisma.post.update({
      where: { id },
      data: { status: PostStatus.PUBLISHING, failedReason: null },
    });
    await this.publishQueue.remove(id);
    return this.publishDue(id, { retryFailed: false });
  }

  private async syncTargets(
    existing: Prisma.PostGetPayload<{
      include: { targets: { include: { socialAccount: true } } };
    }>,
    platforms: Platform[],
    byPlatform: Map<Platform, { id: string }>,
    unpublishedStatus: PostStatus,
  ) {
    const wanted = new Set(platforms);
    for (const target of existing.targets) {
      const platform = target.socialAccount.platform;
      if (wanted.has(platform)) continue;
      if (target.platformPostId || target.status === PostStatus.PUBLISHED) {
        throw new BadRequestException(
          `${channelLabel(platform)} already went out and cannot be removed`,
        );
      }
      await this.prisma.postTarget.delete({ where: { id: target.id } });
    }
    for (const platform of platforms) {
      const current = existing.targets.find(
        (target) => target.socialAccount.platform === platform,
      );
      const account = byPlatform.get(platform)!;
      if (!current) {
        await this.prisma.postTarget.create({
          data: {
            postId: existing.id,
            socialAccountId: account.id,
            status: unpublishedStatus,
            idempotencyKey: randomUUID(),
          },
        });
        continue;
      }
      if (current.platformPostId || current.status === PostStatus.PUBLISHED) {
        continue;
      }
      await this.prisma.postTarget.update({
        where: { id: current.id },
        data: {
          status: unpublishedStatus,
          socialAccountId: account.id,
          failedReason:
            unpublishedStatus === PostStatus.PUBLISHING
              ? null
              : current.failedReason,
        },
      });
    }
  }

  async get(userId: string, id: string) {
    const post = await this.prisma.post.findFirst({
      where: { id, userId },
      include: { targets: { include: { socialAccount: true } } },
    });
    if (!post) throw new NotFoundException("Post not found");
    return this.present(post);
  }

  async list(userId: string, status?: string) {
    const parsed = this.optionalStatus(status);
    const statusFilter =
      parsed === "QUEUE"
        ? {
            status: {
              in: [
                PostStatus.SCHEDULED,
                PostStatus.PUBLISHING,
                PostStatus.PUBLISHED,
                PostStatus.FAILED,
              ],
            },
          }
        : parsed === PostStatus.SCHEDULED
          ? { status: { in: [PostStatus.SCHEDULED, PostStatus.PUBLISHING] } }
          : parsed === PostStatus.FAILED
            ? {
                OR: [
                  { status: PostStatus.FAILED },
                  { targets: { some: { status: PostStatus.FAILED } } },
                ],
              }
            : parsed
              ? { status: parsed }
              : {};
    const posts = await this.prisma.post.findMany({
      where: { userId, ...statusFilter },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { targets: { include: { socialAccount: true } } },
    });
    return { items: await Promise.all(posts.map((post) => this.present(post))) };
  }

  async publishDue(postId: string, options: { retryFailed?: boolean } = {}) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { targets: { include: { socialAccount: true } } },
    });
    if (!post) {
      this.log.warn(`publish skipped, missing ${postId}`);
      return { id: postId, status: "GONE" as const };
    }
    if (post.status === PostStatus.DRAFT) {
      this.log.warn(`publish skipped, draft ${postId}`);
      return this.present(post);
    }
    const alreadyOut = post.targets.every(
      (target) => target.status === PostStatus.PUBLISHED && target.platformPostId,
    );
    if (alreadyOut) {
      return this.present(post);
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: { status: PostStatus.PUBLISHING },
    });
    await this.prisma.postTarget.updateMany({
      where: {
        postId,
        platformPostId: null,
        status: {
          in: [PostStatus.SCHEDULED, PostStatus.PUBLISHING, PostStatus.FAILED],
        },
      },
      data: { status: PostStatus.PUBLISHING },
    });

    const current = await this.prisma.post.findUniqueOrThrow({
      where: { id: postId },
      include: { targets: { include: { socialAccount: true } } },
    });
    const overrides = asOverrideMap(current.contentByPlatform);

    for (const target of current.targets) {
      if (target.platformPostId || target.status === PostStatus.PUBLISHED) {
        continue;
      }
      const body = (overrides[target.socialAccount.platform] ?? current.content).trim();
      try {
        const media = await this.media.hydrate(current.userId, current.mediaUrls);
        const result = await this.social.publishToAccount(
          target.socialAccount,
          body,
          media,
        );
        await this.prisma.postTarget.update({
          where: { id: target.id },
          data: {
            status: PostStatus.PUBLISHED,
            platformPostId: result.platformPostId,
            publishedAt: new Date(),
            failedReason: null,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Publish failed";
        await this.prisma.postTarget.update({
          where: { id: target.id },
          data: {
            status: PostStatus.FAILED,
            failedReason: message.slice(0, 500),
          },
        });
      }
    }

    const fresh = await this.prisma.post.findUniqueOrThrow({
      where: { id: postId },
      include: { targets: { include: { socialAccount: true } } },
    });
    const published = fresh.targets.filter((t) => t.status === PostStatus.PUBLISHED);
    const failed = fresh.targets.filter((t) => t.status === PostStatus.FAILED);
    const rollup =
      failed.length === 0
        ? PostStatus.PUBLISHED
        : published.length === 0
          ? PostStatus.FAILED
          : PostStatus.PUBLISHED;
    const failedReason =
      failed.length === 0
        ? null
        : failed
            .map(
              (t) =>
                `${channelLabel(t.socialAccount.platform)}: ${publicPublishError(t.failedReason)}`,
            )
            .join(" · ")
            .slice(0, 500);

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: {
        status: rollup,
        publishedAt: published.length ? new Date() : null,
        failedReason,
      },
      include: { targets: { include: { socialAccount: true } } },
    });

    await this.notifications.recordOutcome({
      userId: updated.userId,
      postId: updated.id,
      snippet: updated.content,
      published: published.map((t) => channelLabel(t.socialAccount.platform)),
      failed: failed.map((t) => ({
        label: channelLabel(t.socialAccount.platform),
        reason: publicPublishError(t.failedReason),
      })),
    });

    const presented = await this.present(updated);
    if (options.retryFailed !== false && failed.length) {
      throw new Error(failedReason ?? "Publish failed");
    }
    return presented;
  }

  private async requireLiveAccounts(userId: string, platforms: Platform[]) {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { userId, platform: { in: platforms }, isActive: true },
    });
    const paused = accounts.filter((row) => row.pausedByPlan);
    if (paused.length) {
      throw new ForbiddenException(
        `${paused.map((row) => channelLabel(row.platform)).join(", ")} ${
          paused.length === 1 ? "is" : "are"
        } paused until Pro. Upgrade to send.`,
      );
    }
    const byPlatform = new Map(accounts.map((row) => [row.platform, row]));
    const missing = platforms.filter((platform) => !byPlatform.has(platform));
    if (missing.length) {
      throw new BadRequestException(
        `Connect ${missing.map(channelLabel).join(", ")} first`,
      );
    }
    return byPlatform;
  }

  private parseAction(raw?: string): PostAction {
    if (raw === "draft" || raw === "schedule" || raw === "now") return raw;
    throw new BadRequestException("Use draft, schedule, or now");
  }

  private parsePlatforms(raw?: string[]) {
    if (!raw?.length) {
      throw new BadRequestException("Pick at least one channel");
    }
    const unique = [...new Set(raw.map((item) => item.trim().toUpperCase()))];
    const platforms: Platform[] = [];
    for (const item of unique) {
      if (!LIVE_PLATFORMS.has(item as Platform)) {
        throw new BadRequestException(`Unknown channel ${item}`);
      }
      platforms.push(item as Platform);
    }
    return platforms;
  }

  private parseSchedule(action: PostAction, raw?: string | null) {
    if (action === "draft") {
      if (!raw) return null;
      const at = new Date(raw);
      if (Number.isNaN(at.getTime())) {
        throw new BadRequestException("That date is not valid");
      }
      return at;
    }
    if (action === "now") return new Date();
    if (!raw) {
      throw new BadRequestException("Pick an IST time to schedule");
    }
    const at = new Date(raw);
    if (Number.isNaN(at.getTime())) {
      throw new BadRequestException("That date is not valid");
    }
    if (at.getTime() < Date.now() - 60_000) {
      throw new BadRequestException("Schedule a time in the future");
    }
    return at;
  }

  private cleanOverrides(global: string, raw?: Record<string, string>) {
    const next: Record<string, string> = {};
    if (!raw) return next;
    for (const [key, value] of Object.entries(raw)) {
      const platform = key.trim().toUpperCase();
      if (!LIVE_PLATFORMS.has(platform as Platform)) continue;
      const text = value.trim();
      if (text && text !== global) next[platform] = text;
    }
    return next;
  }

  private optionalStatus(raw?: string) {
    if (!raw) return undefined;
    const value = raw.trim().toUpperCase();
    if (value === "QUEUE") return "QUEUE" as const;
    if (!(value in PostStatus)) {
      throw new BadRequestException("Unknown status");
    }
    return value as PostStatus;
  }

  private async present(
    post: Prisma.PostGetPayload<{
      include: { targets: { include: { socialAccount: true } } };
    }>,
  ) {
    const overrides = asOverrideMap(post.contentByPlatform);
    const media = await this.media.hydrate(post.userId, post.mediaUrls);
    return {
      id: post.id,
      content: post.content,
      contentByPlatform: Object.keys(overrides).length ? overrides : null,
      mediaUrls: post.mediaUrls,
      media,
      status: post.status,
      scheduledAt: post.scheduledAt?.toISOString() ?? null,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      failedReason: publicFailed(post),
      aiGenerated: post.aiGenerated,
      jobId: post.jobId,
      createdAt: post.createdAt.toISOString(),
      targets: post.targets.map((target) => ({
        id: target.id,
        platform: target.socialAccount.platform,
        status: target.status,
        platformPostId: target.platformPostId,
        failedReason:
          target.status === PostStatus.FAILED
            ? publicPublishError(target.failedReason)
            : null,
        publishedAt: target.publishedAt?.toISOString() ?? null,
      })),
    };
  }
}

function asOverrideMap(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const next: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string" && item.trim()) next[key] = item;
  }
  return next;
}

function publicFailed(
  post: Prisma.PostGetPayload<{
    include: { targets: { include: { socialAccount: true } } };
  }>,
) {
  const failed = post.targets.filter((t) => t.status === PostStatus.FAILED);
  if (!failed.length) return null;
  return failed
    .map(
      (t) =>
        `${channelLabel(t.socialAccount.platform)}: ${publicPublishError(t.failedReason)}`,
    )
    .join(" · ");
}
