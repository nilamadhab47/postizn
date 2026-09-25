import { Injectable } from "@nestjs/common";
import { Platform } from "@prisma/client";
import type { AuthResult } from "./base-provider";
import { TokenProvider, field, readJson } from "./token-provider";

type TelegramChat = {
  id?: number;
  title?: string;
  username?: string;
  type?: string;
  first_name?: string;
};

type TelegramUser = {
  id?: number;
  username?: string;
  first_name?: string;
};

type TelegramApi<T> = {
  ok?: boolean;
  description?: string;
  result?: T;
};

type TelegramMember = {
  status?: string;
  can_post_messages?: boolean;
  user?: TelegramUser;
};

@Injectable()
export class TelegramProvider extends TokenProvider {
  readonly platform = Platform.TELEGRAM;
  readonly slug = "telegram";
  readonly label = "Telegram";
  readonly blurb = "Post to a channel. Bot must be admin.";
  readonly tokenFields = [
    {
      name: "botToken",
      label: "Bot token",
      placeholder: "123456:ABC…",
      hint: "From @BotFather → /newbot. Not the BotFather chat itself.",
      secret: true,
    },
    {
      name: "chatId",
      label: "Channel",
      placeholder: "@channel, t.me/channel, or -100…",
      hint: "Add this bot as admin with Post messages, then paste the public link.",
    },
  ];

  async authenticateToken(fields: Record<string, string>): Promise<AuthResult> {
    const botToken = field(fields, "botToken");
    const rawChat = field(fields, "chatId");
    if (!botToken || !rawChat) {
      throw new Error("Bot token and channel are required");
    }

    const chatId = normalizeTelegramChatId(rawChat);
    if (isBotFather(chatId)) {
      throw new Error(
        "BotFather is where you create the bot. Paste your channel link, like t.me/yourchannel or @yourchannel.",
      );
    }

    const me = await telegramApi<TelegramUser>(botToken, "getMe");
    if (!me.ok || me.result?.id == null) {
      throw new Error(cleanTelegramError(me.description, "Telegram bot token was rejected"));
    }

    const chat = await telegramApi<TelegramChat>(botToken, "getChat", { chat_id: chatId });
    if (!chat.ok || chat.result?.id == null) {
      throw new Error(
        explainMissingChat(chatId, cleanTelegramError(chat.description, "Could not open that Telegram channel")),
      );
    }

    if (chat.result.type !== "channel" && chat.result.type !== "supergroup") {
      throw new Error(
        "That target is not a channel. Create a channel, add this bot as admin, then paste t.me/yourchannel.",
      );
    }

    const member = await telegramApi<TelegramMember>(botToken, "getChatMember", {
      chat_id: chat.result.id,
      user_id: me.result.id,
    });
    if (!canBotPost(member)) {
      const botHandle = me.result.username ? `@${me.result.username}` : "the bot";
      const channel = chat.result.username
        ? `@${chat.result.username}`
        : chat.result.title ?? "the channel";
      throw new Error(
        `Add ${botHandle} as an admin of ${channel} with Post messages, then connect again.`,
      );
    }

    return {
      platformId: String(chat.result.id),
      username: chat.result.username ?? me.result.username ?? "telegram",
      displayName: chat.result.title ?? me.result.first_name ?? "Telegram",
      accessToken: botToken,
    };
  }

  async publishPost(input: {
    content: string;
    mediaUrls: string[];
    accessToken: string;
    platformId: string;
  }) {
    const photo = input.mediaUrls[0];
    const endpoint = photo ? "sendPhoto" : "sendMessage";
    const body = photo
      ? {
          chat_id: input.platformId,
          photo,
          caption: input.content.slice(0, 1024),
        }
      : { chat_id: input.platformId, text: input.content.slice(0, 4096) };

    const json = await telegramApi<{ message_id?: number }>(
      input.accessToken,
      endpoint,
      body,
    );
    if (!json.ok || json.result?.message_id == null) {
      throw new Error(cleanTelegramError(json.description, "Telegram publish failed"));
    }
    return { platformPostId: String(json.result.message_id) };
  }
}

export function normalizeTelegramChatId(raw: string) {
  let value = raw.trim();
  value = value.replace(/^https?:\/\//i, "");
  value = value.replace(/^(?:t\.me|telegram\.me|telegram\.dog)\//i, "");
  value = value.replace(/^\/+/, "");
  value = value.split(/[/?#]/)[0] ?? value;
  value = decodeURIComponent(value).replace(/^@/, "");
  if (!value || /^joinchat$/i.test(value) || value.startsWith("+")) {
    throw new Error(
      "Invite links cannot be used. Add the bot as admin, then paste @username or the -100… id.",
    );
  }
  if (/^-?\d+$/.test(value)) return value;
  return `@${value}`;
}

function isBotFather(chatId: string) {
  return /^@?botfather$/i.test(chatId.replace(/^@/, ""));
}

function canBotPost(member: TelegramApi<TelegramMember>) {
  const status = member.result?.status;
  if (status === "creator") return true;
  if (status === "administrator") return member.result?.can_post_messages !== false;
  return false;
}

function explainMissingChat(chatId: string, description: string) {
  if (/chat not found/i.test(description)) {
    return `Telegram could not open ${chatId}. Use the public link (t.me/yourchannel) and add the bot as admin first.`;
  }
  return description;
}

function cleanTelegramError(description: string | undefined, fallback: string) {
  return (description ?? fallback).replace(
    /^(Bad Request|Forbidden|Unauthorized|Not Found):\s*/i,
    "",
  );
}

async function telegramApi<T>(
  botToken: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<TelegramApi<T>> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return (await readJson(res)) as TelegramApi<T>;
}
