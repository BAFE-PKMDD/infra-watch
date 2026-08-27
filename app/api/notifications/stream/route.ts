import { auth } from "@/lib/auth";
import { subscribeToNotifications } from "@/lib/realtime-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SessionUser = { id: string; role?: string | null };

export type NotificationStreamDependencies = {
  getSessionUser: (request: Request) => Promise<SessionUser | null>;
  subscribe: (
    userId: string,
    controller: ReadableStreamDefaultController<Uint8Array>,
  ) => () => void;
};

export function createNotificationStreamGetHandler(
  dependencies: NotificationStreamDependencies,
) {
  return async function GET(request: Request) {
    const user = await dependencies.getSessionUser(request);
    if (!user) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    let unsubscribe: (() => void) | null = null;
    let keepAlive: ReturnType<typeof setInterval> | null = null;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        unsubscribe = dependencies.subscribe(user.id, controller);

        keepAlive = setInterval(() => {
          try {
            controller.enqueue(new TextEncoder().encode(": keep-alive\n\n"));
          } catch {
            if (keepAlive) clearInterval(keepAlive);
            unsubscribe?.();
          }
        }, 25000);

        request.signal.addEventListener("abort", () => {
          if (keepAlive) clearInterval(keepAlive);
          unsubscribe?.();
          try {
            controller.close();
          } catch {
            // Connection may already be closed by the browser.
          }
        });
      },
      cancel() {
        if (keepAlive) clearInterval(keepAlive);
        unsubscribe?.();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "private, no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  };
}

export const GET = createNotificationStreamGetHandler({
  getSessionUser: async (request) => {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      return session?.user ? { id: session.user.id, role: session.user.role } : null;
    } catch {
      return null;
    }
  },
  subscribe: subscribeToNotifications,
});
