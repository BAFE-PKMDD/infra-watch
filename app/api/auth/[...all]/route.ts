import { auth } from "@/lib/auth";
import { getAuditContextFromRequest, logFailedAuthAttempt } from "@/lib/audit";
import { toNextJsHandler } from "better-auth/next-js";

const handlers = toNextJsHandler(auth.handler);

export const GET = handlers.GET;

export async function POST(request: Request) {
  const requestForAudit = request.clone();
  const response = await handlers.POST(request);

  if (!response.ok && isSignInAttempt(requestForAudit)) {
    await logAuthFailureFromRequest(requestForAudit, response);
  }

  return response;
}

function isSignInAttempt(request: Request) {
  const path = new URL(request.url).pathname.toLowerCase();
  return path.includes("/sign-in") || path.includes("/signin") || path.includes("/email-otp");
}

async function logAuthFailureFromRequest(request: Request, response: Response) {
  const body = await readJsonObject(request);
  const errorBody = await readJsonObject(response.clone());
  const email = stringValue(body.email) ?? stringValue(body.identifier);
  const method = resolveAuthMethod(new URL(request.url).pathname, body);
  const reason = stringValue(errorBody.message) ?? stringValue(errorBody.error) ?? (response.statusText || "Authentication failed");

  await logFailedAuthAttempt({
    email,
    method,
    reason,
    requestPath: new URL(request.url).pathname,
    status: response.status,
    context: getAuditContextFromRequest(request, { email }),
  });
}

async function readJsonObject(source: Request | Response): Promise<Record<string, unknown>> {
  try {
    const value = await source.json();
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function resolveAuthMethod(path: string, body: Record<string, unknown>) {
  const lowerPath = path.toLowerCase();
  if (lowerPath.includes("email-otp") || stringValue(body.otp)) return "email_otp";
  if (lowerPath.includes("social")) return "social";
  return "email_password";
}
