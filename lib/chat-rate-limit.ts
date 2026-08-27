import { createHmac } from "node:crypto";

import { lt, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { chatRateLimits } from "@/lib/db/schema";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getChatClientIdentity(input: {
  userId: string | null;
  conversationId: string;
  cookieClientId: string | null;
  trustedProxyIp: string | null;
}) {
  if (input.userId) {
    return { value: `user:${input.userId}`, clientId: null };
  }

  const clientId =
    input.cookieClientId && UUID_PATTERN.test(input.cookieClientId)
      ? input.cookieClientId
      : crypto.randomUUID();

  return {
    value: input.trustedProxyIp
      ? `anonymous:ip:${input.trustedProxyIp}`
      : `anonymous:${clientId}`,
    clientId,
  };
}

export function hashRateLimitIdentity(identity: string, secret: string) {
  return createHmac("sha256", secret).update(identity).digest("hex");
}

function getChatIdentitySecret() {
  return (
    process.env.CHAT_RATE_LIMIT_SECRET ||
    process.env.BETTER_AUTH_SECRET ||
    "infra-watch-development-rate-limit-secret"
  );
}

export function getChatOwnerKey(
  identity: string,
  secret = getChatIdentitySecret(),
) {
  return hashRateLimitIdentity(identity, secret);
}

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed)
    ? Math.min(Math.max(parsed, minimum), maximum)
    : fallback;
}

async function incrementWindow(
  key: string,
  limit: number,
  windowMs: number,
  now: Date,
) {
  const resetBefore = new Date(now.getTime() - windowMs);
  const resetBeforeIso = resetBefore.toISOString();
  const nowIso = now.toISOString();
  const [result] = await db
    .insert(chatRateLimits)
    .values({
      key,
      requestCount: 1,
      windowStartedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: chatRateLimits.key,
      set: {
        requestCount: sql<number>`case
          when ${chatRateLimits.windowStartedAt} <= ${resetBeforeIso}::timestamp then 1
          else ${chatRateLimits.requestCount} + 1
        end`,
        windowStartedAt: sql<Date>`case
          when ${chatRateLimits.windowStartedAt} <= ${resetBeforeIso}::timestamp then ${nowIso}::timestamp
          else ${chatRateLimits.windowStartedAt}
        end`,
        updatedAt: now,
      },
    })
    .returning({
      requestCount: chatRateLimits.requestCount,
      windowStartedAt: chatRateLimits.windowStartedAt,
    });

  if (!result) {
    throw new Error("Rate-limit counter was not updated.");
  }

  return {
    allowed: result.requestCount <= limit,
    limit,
    remaining: Math.max(0, limit - result.requestCount),
    resetAt: new Date(result.windowStartedAt.getTime() + windowMs),
  };
}

export async function checkChatRateLimits(identity: string) {
  const now = new Date();
  const identityHash = getChatOwnerKey(identity);
  const perMinuteLimit = boundedInteger(
    process.env.CHAT_RATE_LIMIT_PER_MINUTE,
    5,
    1,
    100,
  );
  const dailyGlobalLimit = boundedInteger(
    process.env.CHAT_GLOBAL_DAILY_LIMIT,
    2_000,
    10,
    1_000_000,
  );

  try {
    await db
      .delete(chatRateLimits)
      .where(lt(chatRateLimits.updatedAt, new Date(now.getTime() - 48 * 60 * 60 * 1_000)));

    const client = await incrementWindow(
      `minute:${identityHash}`,
      perMinuteLimit,
      60_000,
      now,
    );
    if (!client.allowed) {
      return {
        allowed: false,
        limit: client.limit,
        remaining: client.remaining,
        resetAt: client.resetAt,
        globalLimitReached: false,
      };
    }

    const dayKey = now.toISOString().slice(0, 10);
    const global = await incrementWindow(
      `global:${dayKey}`,
      dailyGlobalLimit,
      24 * 60 * 60 * 1_000,
      now,
    );

    return {
      allowed: client.allowed && global.allowed,
      limit: client.limit,
      remaining: client.remaining,
      resetAt: client.resetAt,
      globalLimitReached: !global.allowed,
    };
  } catch (error) {
    console.error("[Rate Limit] DB check failed; rejecting chat request:", error);
    throw error;
  }
}
