export const VOICE_MAX_OUTPUT_TOKENS = 768;

export const VOICE_RESPONSE_INSTRUCTION = `This request is spoken through ANIA—Agricultural Network Intelligence Assistant. Identify yourself as ANIA if asked. Give a complete answer in concise, natural language. For project-list requests, name and summarize every returned project when the result set is small; for larger sets, cover up to five projects and state how many additional matches exist. Prefer short sentences and avoid Markdown tables, charts, headings, raw URLs, repeated caveats, and unnecessarily long lists because the answer will be read aloud.`;

export function prepareSpeechChunks(text: string, maxChars = 280) {
  if (!Number.isFinite(maxChars) || maxChars < 20) {
    throw new Error("Speech chunks must allow at least 20 characters.");
  }

  const speech = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[*_#>`|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!speech) return [];

  const sentences = speech.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  for (const rawSentence of sentences) {
    let remaining = rawSentence.trim();
    while (remaining.length > maxChars) {
      const boundary = remaining.lastIndexOf(" ", maxChars);
      const splitAt = boundary > 0 ? boundary : maxChars;
      chunks.push(remaining.slice(0, splitAt).trim());
      remaining = remaining.slice(splitAt).trim();
    }
    if (remaining) chunks.push(remaining);
  }
  return chunks;
}

export function clearOwnedPlaybackSettlement(
  settlementRef: { current: (() => void) | null },
  owner: (() => void) | null,
) {
  if (owner && settlementRef.current === owner) settlementRef.current = null;
}

export async function runSpeechChunkPipeline<T>({
  chunks,
  generate,
  play,
  shouldContinue,
}: {
  chunks: string[];
  generate: (chunk: string) => Promise<T>;
  play: (audio: T, onStarted: () => void) => Promise<boolean>;
  shouldContinue: () => boolean;
}) {
  if (!chunks.length || !shouldContinue()) return false;
  const safelyGenerate = (chunk: string) =>
    generate(chunk).then(
      (audio) => ({ ok: true as const, audio }),
      (error: unknown) => ({ ok: false as const, error }),
    );
  let pendingGeneration = safelyGenerate(chunks[0]);

  for (let index = 0; index < chunks.length; index += 1) {
    const generated = await pendingGeneration;
    if (!generated.ok) throw generated.error;
    if (!shouldContinue()) return false;

    const nextChunk = chunks[index + 1];
    let nextGeneration: ReturnType<typeof safelyGenerate> | null = null;
    const prefetchNext = () => {
      if (nextChunk && !nextGeneration) nextGeneration = safelyGenerate(nextChunk);
    };
    const played = await play(generated.audio, prefetchNext);
    if (!played || !shouldContinue()) return false;
    if (nextChunk) {
      prefetchNext();
      pendingGeneration = nextGeneration!;
    }
  }
  return true;
}

type WakeReconnectContext = {
  enabled: boolean;
  preferred: boolean;
  operationMatches: boolean;
};

export function shouldReconnectWakeSocket({
  enabled,
  preferred,
  operationMatches,
}: WakeReconnectContext) {
  return enabled && preferred && operationMatches;
}

export function reconnectDelayMs(attempt: number) {
  return Math.min(10_000, 500 * 2 ** Math.max(0, attempt));
}

export function getKokoroInferenceOptions() {
  return {
    dtype: "q8" as const,
    device: "wasm" as const,
  };
}

export function shouldAutoEnableVoice({
  configured,
  explicitlyDisabled,
}: {
  configured: boolean;
  explicitlyDisabled: boolean;
}) {
  return configured && !explicitlyDisabled;
}

export function isVoiceExplicitlyDisabled(persistedPreference: string | null) {
  return persistedPreference === "false";
}

export function canStartVoiceRecording({
  hasStream,
  recordingClaimed,
  recorderActive,
}: {
  hasStream: boolean;
  recordingClaimed: boolean;
  recorderActive: boolean;
}) {
  return hasStream && !recordingClaimed && !recorderActive;
}

export function shouldStartConversationalFollowup({
  enabled,
  operationMatches,
  alreadyFollowup,
}: {
  enabled: boolean;
  operationMatches: boolean;
  alreadyFollowup: boolean;
}) {
  return enabled && operationMatches && !alreadyFollowup;
}

export function isSleepCommand(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return /^(?:(?:hey )?(?:ania|anya) (?:please )?(?:go to )?sleep|sleep (?:please )?(?:ania|anya))$/.test(
    normalized,
  );
}

type RecordingDecision = "continue" | "process" | "ask_again" | "return_to_wake";

export function getRecordingDecision({
  elapsedMs,
  heardSpeech,
  retryAttempt,
  trailingSilenceMs = 0,
}: {
  elapsedMs: number;
  heardSpeech: boolean;
  retryAttempt: number;
  trailingSilenceMs?: number;
}): RecordingDecision {
  if (heardSpeech) return trailingSilenceMs >= 1_200 ? "process" : "continue";
  if (elapsedMs < 5_000) return "continue";
  return retryAttempt === 0 ? "ask_again" : "return_to_wake";
}
