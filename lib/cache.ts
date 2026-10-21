import { createHash } from "node:crypto";
import { createClient } from "redis";

type RedisClient = ReturnType<typeof createClient>;
let client: RedisClient | null = null;
let connecting: Promise<RedisClient | null> | null = null;
let retryAfter = 0;
const memory = new Map<string, { expires: number; value: unknown }>();
const inflight = new Map<string, Promise<unknown>>();
let generation = 0;
const instance = createHash("sha256")
  .update(process.env.BETTER_AUTH_URL || "local")
  .digest("hex")
  .slice(0, 12);
const prefix = `infra-watch:${instance}:public:`;

export async function getRedisClient(): Promise<RedisClient | null> {
  if (!process.env.REDIS_URL || Date.now() < retryAfter) return null;
  if (client?.isReady) return client;
  if (connecting) return connecting;
  connecting = (async () => {
    const next = createClient({
      url: process.env.REDIS_URL,
      disableOfflineQueue: true,
      socket: {
        connectTimeout: 1500,
        socketTimeout: 1500,
        reconnectStrategy: false,
      },
    });
    next.on("error", () => {});
    try {
      await next.connect();
      client = next;
      return next;
    } catch {
      next.destroy();
      retryAfter = Date.now() + 30_000;
      return null;
    } finally {
      connecting = null;
    }
  })();
  return connecting;
}

export async function cachedPublic<T>(
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>,
): Promise<T> {
  const currentGeneration = generation;
  const cacheKey = prefix + key;
  const local = memory.get(cacheKey);
  if (local && local.expires > Date.now()) return local.value as T;
  const existing = inflight.get(cacheKey);
  if (existing) return existing as Promise<T>;
  const pending = (async () => {
    const redis = await getRedisClient();
    if (redis) {
      try {
        const raw = await redis.get(cacheKey);
        if (raw) return JSON.parse(raw) as T;
      } catch {
        /* The source database remains available when Redis is down. */
      }
    }
    const value = await load();
    if (currentGeneration === generation) {
      if (memory.size >= 100) memory.delete(memory.keys().next().value!);
      memory.set(cacheKey, {
        expires: Date.now() + Math.min(ttlSeconds, 30) * 1000,
        value,
      });
      if (redis)
        await redis
          .set(cacheKey, JSON.stringify(value), { EX: ttlSeconds })
          .catch(() => {});
    }
    return value;
  })();
  inflight.set(cacheKey, pending);
  try {
    return await pending;
  } finally {
    if (inflight.get(cacheKey) === pending) inflight.delete(cacheKey);
  }
}

export async function clearPublicCache() {
  generation++;
  memory.clear();
  inflight.clear();
  const redis = await getRedisClient();
  if (!redis)
    return { removed: 0, redisConfigured: Boolean(process.env.REDIS_URL) };
  let removed = 0;
  for await (const keys of redis.scanIterator({
    MATCH: `${prefix}*`,
    COUNT: 100,
  })) {
    if (keys.length) removed += await redis.del(keys);
  }
  return { removed, redisConfigured: true };
}
