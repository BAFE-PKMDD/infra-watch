import { auth } from "@/lib/auth";
import {
  getNotificationsForUser,
  markUserNotificationsRead,
  type StoredNotification,
} from "@/lib/notification-persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIVATE_NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };
const MAX_MARK_READ_BODY_BYTES = 4096;
const MAX_NOTIFICATION_ID_LENGTH = 128;

async function readRequestBodyWithLimit(
  request: Request,
  maxBytes: number,
): Promise<{ body: string; tooLarge: boolean }> {
  if (!request.body) return { body: "", tooLarge: false };

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let body = "";
  let bytesRead = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      body += decoder.decode();
      return { body, tooLarge: false };
    }

    bytesRead += value.byteLength;
    if (bytesRead > maxBytes) {
      await reader.cancel("Notification request body exceeds the allowed size");
      return { body: "", tooLarge: true };
    }
    body += decoder.decode(value, { stream: true });
  }
}
type SessionUser = { id: string; role?: string | null };

export type NotificationRouteDependencies = {
  getSessionUser: (request: Request) => Promise<SessionUser | null>;
  getNotificationsForUser: (userId: string) => Promise<StoredNotification[]>;
  markUserNotificationsRead: (
    userId: string,
    options: { id?: string; all?: boolean },
  ) => Promise<{ marked: number }>;
};

function unauthorized() {
  return Response.json(
    { success: false, error: "Unauthorized" },
    { status: 401, headers: PRIVATE_NO_STORE_HEADERS },
  );
}

export function createNotificationsGetHandler(dependencies: NotificationRouteDependencies) {
  return async function GET(request: Request) {
    const user = await dependencies.getSessionUser(request);
    if (!user) return unauthorized();

    const data = await dependencies.getNotificationsForUser(user.id);
    return Response.json(
      {
        success: true,
        data,
      },
      { headers: PRIVATE_NO_STORE_HEADERS },
    );
  };
}

export function createNotificationsPostHandler(dependencies: NotificationRouteDependencies) {
  return async function POST(request: Request) {
    const user = await dependencies.getSessionUser(request);
    if (!user) return unauthorized();

    const declaredLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_MARK_READ_BODY_BYTES) {
      return Response.json(
        { success: false, error: "Request body is too large" },
        { status: 413, headers: PRIVATE_NO_STORE_HEADERS },
      );
    }

    const { body: rawBody, tooLarge } = await readRequestBodyWithLimit(
      request,
      MAX_MARK_READ_BODY_BYTES,
    );
    if (tooLarge) {
      return Response.json(
        { success: false, error: "Request body is too large" },
        { status: 413, headers: PRIVATE_NO_STORE_HEADERS },
      );
    }

    let body: { id?: unknown; all?: unknown } = {};
    try {
      const parsed = JSON.parse(rawBody) as unknown;
      body = parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as { id?: unknown; all?: unknown })
        : {};
    } catch {
      body = {};
    }

    if (
      body.id !== undefined &&
      (typeof body.id !== "string" ||
        body.id.length < 1 ||
        body.id.length > MAX_NOTIFICATION_ID_LENGTH)
    ) {
      return Response.json(
        { success: false, error: "Invalid notification id" },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
      );
    }

    if (body.all !== true && body.id === undefined) {
      return Response.json(
        { success: false, error: "Provide a notification id or all=true" },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
      );
    }

    const options = {
      id: typeof body.id === "string" ? body.id : undefined,
      all: body.all === true,
    };
    const result = await dependencies.markUserNotificationsRead(user.id, options);
    const data = await dependencies.getNotificationsForUser(user.id);

    return Response.json(
      { success: true, marked: result.marked, data },
      { headers: PRIVATE_NO_STORE_HEADERS },
    );
  };
}

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
