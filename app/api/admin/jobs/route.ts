import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { backgroundJobs } from "@/lib/db/schema";
import { enqueueJob, listJobs } from "@/lib/background-jobs";
import { apiError, jsonBody, requireStaffApi } from "@/lib/staff-api";

export async function GET(request: Request) {
  try {
    await requireStaffApi(true);
    const kind = z
      .enum([
        "abemis-sync",
        "location-sync",
        "media-moderation",
        "notification-delivery",
      ])
      .optional()
      .parse(new URL(request.url).searchParams.get("kind") ?? undefined);
    const jobs = await listJobs(kind);
    return Response.json(
      {
        data: jobs.map(
          ({ payload: _payload, leaseToken: _leaseToken, ...job }) => {
            void _payload;
            void _leaseToken;
            return job;
          },
        ),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await requireStaffApi(true);
    const input = z
      .object({ kind: z.enum(["abemis-sync", "location-sync"]) })
      .strict()
      .parse(await jsonBody(request));
    const job = await enqueueJob(input.kind, actor.id);
    return Response.json({ id: job.id, status: job.status }, { status: 202 });
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(request: Request) {
  try {
    await requireStaffApi(true);
    const { id } = z
      .object({ id: z.uuid() })
      .strict()
      .parse(await jsonBody(request));
    const [old] = await db
      .select()
      .from(backgroundJobs)
      .where(
        and(eq(backgroundJobs.id, id), eq(backgroundJobs.status, "failed")),
      )
      .limit(1);
    if (!old)
      return Response.json(
        { error: "Only failed jobs can be retried" },
        { status: 409 },
      );
    // A new run uses the same deduplication key; a concurrently queued run takes precedence.
    const job = await enqueueJob(
      old.kind as
        | "abemis-sync"
        | "location-sync"
        | "media-moderation"
        | "notification-delivery",
      old.requestedBy,
      old.payload,
      old.dedupeKey,
    );
    return Response.json({ id: job.id, status: job.status }, { status: 202 });
  } catch (error) {
    return apiError(error);
  }
}
