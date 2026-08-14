import { createHmac, timingSafeEqual } from "node:crypto";
import { auth } from "@/lib/auth";
import { isVoiceAssistantEnabled } from "@/lib/voice/config";

export const runtime = "nodejs";

type SessionUser = { id: string; role?: string | null };
export type WakeTokenDependencies = {
  isFeatureEnabled: () => boolean;
  getSessionUser: (request: Request) => Promise<SessionUser | null>;
  getSecret: () => string;
  now: () => number;
};

type WakeTokenPayload = { userId: string; expiresAt: number };

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createWakeToken(
  payload: WakeTokenPayload,
  secret: string,
) {
  const body = base64Url(JSON.stringify(payload));
  return `${body}.${sign(body, secret)}`;
}

export function verifyWakeToken(
  token: string,
  secret: string,
  now: number,
): WakeTokenPayload | null {
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra) return null;
  const expected = sign(body, secret);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as WakeTokenPayload;
    if (
      typeof payload.userId !== "string" ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt < now
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function errorResponse(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export function createWakeTokenPostHandler(dependencies: WakeTokenDependencies) {
  return async function POST(request: Request) {
    if (!dependencies.isFeatureEnabled()) {
      return errorResponse("Voice assistant is unavailable.", 404);
    }
    const user = await dependencies.getSessionUser(request);
    if (!user) return errorResponse("Sign in to use ANIA.", 401);
    if (user.role !== "admin") return errorResponse("Administrator access is required.", 403);

    const secret = dependencies.getSecret();
    if (secret.length < 24) {
      return errorResponse("Wake-word service is not configured.", 503);
    }
    const expiresAt = dependencies.now() + 60;
    return Response.json(
      { token: createWakeToken({ userId: user.id, expiresAt }, secret), expiresAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  };
}

export const POST = createWakeTokenPostHandler({
  isFeatureEnabled: isVoiceAssistantEnabled,
  getSessionUser: async (request) => {
    const session = await auth.api.getSession({ headers: request.headers });
    return session?.user ? { id: session.user.id, role: session.user.role } : null;
  },
  getSecret: () => process.env.WAKE_WORD_TOKEN_SECRET?.trim() ?? "",
  now: () => Math.floor(Date.now() / 1_000),
});
