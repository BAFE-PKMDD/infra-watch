import { sql } from "drizzle-orm";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { db } from "@/lib/db";
import { getRedisClient } from "@/lib/cache";
import { getStorageBucketForPath, minioClient } from "@/lib/minio";

export async function timedHealth(
  name: string,
  check: () => Promise<unknown>,
  timeoutMs = 2500,
) {
  const started = Date.now();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      check(),
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Timed out")), timeoutMs);
      }),
    ]);
    return {
      name,
      status: "healthy" as const,
      latencyMs: Date.now() - started,
    };
  } catch {
    return {
      name,
      status: "unavailable" as const,
      latencyMs: Date.now() - started,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getServiceHealth() {
  const checks = await Promise.all([
    timedHealth("Database", () => db.execute(sql`select 1`)),
    timedHealth("Public object storage", async () => {
      if (
        !(await minioClient.bucketExists(
          getStorageBucketForPath("feedback/health.jpg"),
        ))
      )
        throw new Error("Missing bucket");
    }),
    timedHealth("Private object storage", async () => {
      if (
        !(await minioClient.bucketExists(
          getStorageBucketForPath("knowledge-base/health.txt"),
        ))
      )
        throw new Error("Missing bucket");
    }),
    process.env.REDIS_URL
      ? timedHealth("Redis cache", async () => {
          const redis = await getRedisClient();
          if (!redis) throw new Error("Redis unavailable");
          await redis.ping();
        })
      : Promise.resolve({
          name: "Redis cache",
          status: "not configured" as const,
          latencyMs: null,
        }),
    timedHealth(
      "Video frame processing",
      async () => {
        const run = promisify(execFile);
        await run(process.env.FFMPEG_PATH || "ffmpeg", ["-version"], {
          timeout: 2000,
          windowsHide: true,
        });
        await run(process.env.FFPROBE_PATH || "ffprobe", ["-version"], {
          timeout: 2000,
          windowsHide: true,
        });
      },
      5000,
    ),
  ]);
  return {
    checkedAt: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    workerEnabled:
      process.env.ENABLE_BACKGROUND_WORKER !== "false" &&
      (process.env.NODE_ENV === "production" ||
        process.env.ENABLE_BACKGROUND_WORKER === "true"),
    checks,
  };
}
