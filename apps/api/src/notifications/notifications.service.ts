import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { NotificationKind } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type PublishNoticeInput = {
  userId: string;
  postId: string;
  snippet: string;
  published: string[];
  failed: { label: string; reason: string }[];
};

@Injectable()
export class NotificationsService {
  private readonly log = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const items = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const unread = items.filter((row) => !row.readAt).length;
    return { unread, items: items.map(presentNotice) };
  }

  async unreadCount(userId: string) {
    const unread = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return { unread };
  }

  async markRead(userId: string, id: string) {
    const row = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!row) throw new NotFoundException("Notice not found");
    if (!row.readAt) {
      await this.prisma.notification.update({
        where: { id },
        data: { readAt: new Date() },
      });
    }
    return this.unreadCount(userId);
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { unread: 0 };
  }

  async recordOutcome(input: PublishNoticeInput) {
    const snippet = clip(input.snippet);
    const kind = input.failed.length ? NotificationKind.FAILED : NotificationKind.PUBLISHED;
    const { title, body } = copyFor(kind, input.published, input.failed, snippet);

    try {
      const existing = await this.prisma.notification.findUnique({
        where: { postId: input.postId },
      });
      if (existing) {
        await this.prisma.notification.update({
          where: { id: existing.id },
          data: {
            kind,
            title,
            body,
            readAt: existing.kind === kind ? existing.readAt : null,
          },
        });
        return;
      }
      await this.prisma.notification.create({
        data: {
          userId: input.userId,
          postId: input.postId,
          kind,
          title,
          body,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "notice failed";
      this.log.warn(`could not record notice for ${input.postId}: ${message}`);
    }
  }
}

function presentNotice(row: {
  id: string;
  postId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    postId: row.postId,
    kind: row.kind,
    title: row.title,
    body: row.body,
    read: Boolean(row.readAt),
    createdAt: row.createdAt.toISOString(),
  };
}

function copyFor(
  kind: NotificationKind,
  published: string[],
  failed: { label: string; reason: string }[],
  snippet: string,
) {
  if (kind === NotificationKind.PUBLISHED) {
    return {
      title: "Posted",
      body: published.length
        ? `Went live on ${joinAnd(published)}. ${snippet}`
        : `Your post went live. ${snippet}`,
    };
  }
  if (published.length && failed.length) {
    return {
      title: "Partly posted",
      body: `Went live on ${joinAnd(published)}. ${joinAnd(failed.map((row) => row.label))} did not go out.`,
    };
  }
  const reason = failed[0]?.reason ?? "Could not publish to this channel.";
  const channels = joinAnd(failed.map((row) => row.label));
  return {
    title: "Did not go out",
    body: channels ? `${channels}: ${reason}` : reason,
  };
}

function joinAnd(items: string[]) {
  const unique = [...new Set(items.filter(Boolean))];
  if (unique.length <= 1) return unique[0] ?? "";
  if (unique.length === 2) return `${unique[0]} and ${unique[1]}`;
  return `${unique.slice(0, -1).join(", ")}, and ${unique[unique.length - 1]}`;
}

function clip(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  return cleaned.length > 80 ? `${cleaned.slice(0, 77)}…` : cleaned;
}
