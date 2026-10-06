import { auth } from "@/lib/auth";
import { subscribeToNotifications } from "@/lib/realtime-notifications";
import { createNotificationStreamGetHandler } from "./stream-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
