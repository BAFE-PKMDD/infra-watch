import { auth } from "@/lib/auth";
import { isVoiceAssistantEnabled } from "@/lib/voice/config";
import { createWakeTokenPostHandler } from "./handlers";
export const runtime = "nodejs";
export const POST = createWakeTokenPostHandler({
  isFeatureEnabled: isVoiceAssistantEnabled,
  getSessionUser: async request => {
    const session = await auth.api.getSession({ headers: request.headers });
    return session?.user ? { id: session.user.id, role: session.user.role } : null;
  },
  getSecret: () => process.env.WAKE_WORD_TOKEN_SECRET?.trim() ?? "",
  now: () => Math.floor(Date.now() / 1_000),
});
