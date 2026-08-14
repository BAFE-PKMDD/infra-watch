import { z } from "zod";
import { auth } from "@/lib/auth";
import { isVoiceAssistantEnabled } from "@/lib/voice/config";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const MAX_MULTIPART_OVERHEAD_BYTES = 64 * 1024;
const MAX_REQUEST_BYTES = MAX_AUDIO_BYTES + MAX_MULTIPART_OVERHEAD_BYTES;
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
]);
const ALLOWED_AUDIO_EXTENSIONS = new Set(["webm", "wav", "mp3", "mp4", "m4a", "ogg"]);

export function isSupportedVoiceAudio(file: File) {
  const type = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
  const extension = file.name.split(".").at(-1)?.toLowerCase() ?? "";
  if (ALLOWED_AUDIO_TYPES.has(type)) return true;
  if (type === "video/webm") return extension === "webm";
  if (type && type !== "application/octet-stream") return false;
  return ALLOWED_AUDIO_EXTENSIONS.has(extension);
}

function normalizeVoiceAudio(file: File) {
  const type = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
  if (type !== "video/webm") return file;
  return new File([file], file.name, {
    type: "audio/webm",
    lastModified: file.lastModified,
  });
}

const audioSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "The recording is empty.")
  .refine(isSupportedVoiceAudio, "Unsupported audio format.");

type SessionUser = { id: string; role?: string | null };

export type VoiceTranscriptionDependencies = {
  isFeatureEnabled: () => boolean;
  getSessionUser: (request: Request) => Promise<SessionUser | null>;
  transcribe: (audio: File, signal: AbortSignal) => Promise<string>;
};

type LocalWhisperTranscriberOptions = {
  endpoint: string;
  token: string;
  fetchImpl?: typeof fetch;
};

function isLoopbackHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function createLocalWhisperTranscriber({
  endpoint,
  token,
  fetchImpl = fetch,
}: LocalWhisperTranscriberOptions) {
  const url = new URL(endpoint);
  const usesLoopback = isLoopbackHostname(url.hostname);
  const usesPrivateDockerService =
    url.hostname === "ania-whisper" &&
    url.port === "8000" &&
    url.pathname === "/transcribe" &&
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash;
  if (url.protocol !== "http:" || (!usesLoopback && !usesPrivateDockerService)) {
    throw new Error(
      "LOCAL_WHISPER_URL must use an HTTP loopback or the private Docker Whisper service.",
    );
  }
  if (token.trim().length < 24) {
    throw new Error("LOCAL_WHISPER_TOKEN must be at least 24 characters.");
  }

  return async (audio: File, signal: AbortSignal) => {
    const form = new FormData();
    form.set("audio", audio, audio.name || "command.webm");

    const response = await fetchImpl(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      redirect: "error",
      signal,
    });
    if (!response.ok) throw new Error(`Local Whisper transcription failed (${response.status}).`);
    const payload = z.object({ text: z.string() }).parse(await response.json());
    return payload.text;
  };
}

function jsonError(error: string, status: number) {
  return Response.json(
    { error },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

async function withBoundedVoiceBody(request: Request) {
  if (!request.body) return request;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_REQUEST_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body,
    signal: request.signal,
  });
}

export function createVoiceTranscriptionPostHandler(
  dependencies: VoiceTranscriptionDependencies,
) {
  return async function POST(request: Request) {
    if (!dependencies.isFeatureEnabled()) {
      return jsonError("Voice assistant is unavailable.", 404);
    }

    const user = await dependencies.getSessionUser(request);
    if (!user) return jsonError("Sign in to use ANIA.", 401);
    if (user.role !== "admin") {
      return jsonError("Administrator access is required.", 403);
    }

    if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
      return jsonError("The voice request must use multipart/form-data.", 415);
    }
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
      return jsonError("The recording exceeds the 25 MB limit.", 413);
    }

    let boundedRequest: Request;
    try {
      const bounded = await withBoundedVoiceBody(request);
      if (!bounded) return jsonError("The recording exceeds the 25 MB limit.", 413);
      boundedRequest = bounded;
    } catch {
      return jsonError("The voice request is invalid.", 400);
    }

    let formData: FormData;
    try {
      formData = await boundedRequest.formData();
    } catch {
      return jsonError("The voice request is invalid.", 400);
    }

    const entries = [...formData.entries()];
    if (entries.length !== 1 || entries[0]?.[0] !== "audio") {
      return jsonError("The voice request must contain exactly one audio recording.", 400);
    }
    const candidate = entries[0][1];
    if (!(candidate instanceof File)) {
      return jsonError("An audio recording is required.", 400);
    }
    if (candidate.size > MAX_AUDIO_BYTES) {
      return jsonError("The recording exceeds the 25 MB limit.", 413);
    }

    const parsed = audioSchema.safeParse(normalizeVoiceAudio(candidate));
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid recording.", 400);
    }

    try {
      const text = (await dependencies.transcribe(parsed.data, request.signal)).trim();
      if (!text) return jsonError("No speech was detected. Please try again.", 422);
      return Response.json(
        { text },
        {
          headers: {
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          },
        },
      );
    } catch (error) {
      if (request.signal.aborted) {
        return jsonError("Transcription was cancelled.", 499);
      }
      console.error(
        "[ANIA transcription]",
        JSON.stringify({
          errorName: error instanceof Error ? error.name : "UnknownError",
        }),
      );
      return jsonError("ANIA could not transcribe that recording. Please try again.", 502);
    }
  };
}

const localWhisperUrl = process.env.LOCAL_WHISPER_URL?.trim() || "http://127.0.0.1:8002/transcribe";
const localWhisperToken = process.env.LOCAL_WHISPER_TOKEN?.trim() ?? "";

const handler = createVoiceTranscriptionPostHandler({
  isFeatureEnabled: isVoiceAssistantEnabled,
  getSessionUser: async (request) => {
    const session = await auth.api.getSession({ headers: request.headers });
    return session?.user
      ? { id: session.user.id, role: session.user.role }
      : null;
  },
  transcribe: (audio, signal) =>
    createLocalWhisperTranscriber({
      endpoint: localWhisperUrl,
      token: localWhisperToken,
    })(audio, signal),
});

export const POST = handler;
