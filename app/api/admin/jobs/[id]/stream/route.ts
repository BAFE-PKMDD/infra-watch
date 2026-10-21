import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { backgroundJobs } from "@/lib/db/schema";
import { apiError, requireStaffApi } from "@/lib/staff-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireStaffApi(true);
    const id = z.uuid().parse((await context.params).id);
    const load = async () =>
      (
        await db
          .select({
            id: backgroundJobs.id,
            status: backgroundJobs.status,
            progress: backgroundJobs.progress,
            error: backgroundJobs.error,
            updatedAt: backgroundJobs.updatedAt,
          })
          .from(backgroundJobs)
          .where(eq(backgroundJobs.id, id))
          .limit(1)
      )[0];
    const initial = await load();
    if (!initial)
      return Response.json({ error: "Job not found" }, { status: 404 });
    const encoder = new TextEncoder();
    let cleanup = () => {};
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let closed = false,
          busy = false;
        const close = () => {
          if (closed) return;
          closed = true;
          cleanup();
          try {
            controller.close();
          } catch {}
        };
        const send = (job: typeof initial) => {
          if (closed) return;
          try {
            controller.enqueue(
              encoder.encode(
                `event: progress\ndata: ${JSON.stringify(job)}\n\n`,
              ),
            );
            if (["completed", "failed"].includes(job.status)) close();
          } catch {
            close();
          }
        };
        const interval = setInterval(async () => {
          if (busy || closed) return;
          busy = true;
          try {
            const job = await load();
            if (job) send(job);
            else close();
          } catch {
            close();
          } finally {
            busy = false;
          }
        }, 2000);
        const timeout = setTimeout(close, 55_000);
        cleanup = () => {
          clearInterval(interval);
          clearTimeout(timeout);
          request.signal.removeEventListener("abort", close);
        };
        request.signal.addEventListener("abort", close, { once: true });
        if (request.signal.aborted) close();
        else send(initial);
      },
      cancel() {
        cleanup();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "private, no-store",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
