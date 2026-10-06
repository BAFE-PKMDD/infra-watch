import { auth } from "@/lib/auth";
import {
  getNotificationsForUser,
  markUserNotificationsRead,
} from "@/lib/notification-persistence";
import {
  createNotificationsGetHandler,
  createNotificationsPostHandler,
  type NotificationRouteDependencies,
} from "./handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dependencies: NotificationRouteDependencies = {
  getSessionUser: async (request) => {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      return session?.user ? { id: session.user.id, role: session.user.role } : null;
    } catch {
      return null;
    }
  },
  getNotificationsForUser,
  markUserNotificationsRead,
};

export const GET = createNotificationsGetHandler(dependencies);
export const POST = createNotificationsPostHandler(dependencies);
