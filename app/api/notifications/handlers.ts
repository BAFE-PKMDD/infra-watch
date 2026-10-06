import {
  type StoredNotification,
} from "@/lib/notification-persistence";

export const PRIVATE_NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };
export const MAX_MARK_READ_BODY_BYTES = 4096;
export const MAX_NOTIFICATION_ID_LENGTH = 128;

export async function readRequestBodyWithLimit(
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

export type SessionUser = { id: string; role?: string | null };

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
    if (!user) {
      return unauthorized();
    }

    const data = await dependencies.getNotificationsForUser(user.id);
    return Response.json(
      { success: true, data },
      { headers: PRIVATE_NO_STORE_HEADERS },
    );
  };
}

export function createNotificationsPostHandler(dependencies: NotificationRouteDependencies) {
  return async function POST(request: Request) {
    const user = await dependencies.getSessionUser(request);
    if (!user) {
      return unauthorized();
    }

    const { body: rawBody, tooLarge } = await readRequestBodyWithLimit(
      request,
      MAX_MARK_READ_BODY_BYTES,
    );

    if (tooLarge) {
      return Response.json(
        { success: false, error: "Payload too large" },
        { status: 413, headers: PRIVATE_NO_STORE_HEADERS },
      );
    }

    let body: { id?: unknown; all?: unknown } = {};
    if (rawBody.trim().length > 0) {
      try {
        const parsed = JSON.parse(rawBody);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          return Response.json(
            { success: false, error: "Invalid request body" },
            { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
          );
        }
        body = parsed as { id?: unknown; all?: unknown };
      } catch {
        return Response.json(
          { success: false, error: "Invalid JSON" },
          { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
        );
      }
    }

    if (body.id !== undefined) {
      if (typeof body.id !== "string" || body.id.trim().length === 0) {
        return Response.json(
          { success: false, error: "id must be a non-empty string" },
          { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
        );
      }
      if (body.id.length > MAX_NOTIFICATION_ID_LENGTH) {
        return Response.json(
          { success: false, error: "id is too long" },
          { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
        );
      }
    }

    if (body.all !== undefined && typeof body.all !== "boolean") {
      return Response.json(
        { success: false, error: "all must be a boolean" },
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
