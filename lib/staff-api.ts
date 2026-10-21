import { z } from "zod";
import { getCurrentUser } from "@/lib/session";

export async function requireStaffApi(adminOnly = false) {
  const user = await getCurrentUser();
  if (!user)
    throw Object.assign(new Error("Sign in to continue"), { status: 401 });
  if (
    adminOnly
      ? user.role !== "admin"
      : !["admin", "regional_admin", "moderator"].includes(user.role ?? "")
  ) {
    throw Object.assign(new Error("Access denied"), { status: 403 });
  }
  return user;
}

export function assertMutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expectedOrigin = new URL(process.env.BETTER_AUTH_URL || request.url)
    .origin;
  if (origin && origin !== expectedOrigin)
    throw Object.assign(new Error("Cross-origin request denied"), {
      status: 403,
    });
}

export async function jsonBody(
  request: Request,
  maxBytes = 32768,
): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    throw Object.assign(new Error("Use application/json"), { status: 415 });
  assertMutationOrigin(request);
  const reader = request.body?.getReader();
  if (!reader)
    throw Object.assign(new Error("A request body is required"), {
      status: 400,
    });
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw Object.assign(new Error("Request body is too large"), {
        status: 413,
      });
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Object.assign(new Error("Invalid JSON body"), { status: 400 });
  }
}

export function apiError(error: unknown) {
  const status =
    error instanceof z.ZodError
      ? 400
      : ((error as { status?: number })?.status ?? 500);
  if (status >= 500)
    console.error(
      "Operational request failed",
      error instanceof Error ? error.name : "UnknownError",
    );
  return Response.json(
    {
      error:
        error instanceof z.ZodError
          ? error.issues.map((issue) => issue.message).join("; ")
          : status < 500 && error instanceof Error
            ? error.message
            : "Service unavailable. Try again.",
    },
    { status },
  );
}
