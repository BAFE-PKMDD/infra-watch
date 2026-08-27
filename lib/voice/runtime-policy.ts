export const VOICE_MAX_OUTPUT_TOKENS = 768;

export const VOICE_RESPONSE_INSTRUCTION = `This request is spoken through ANIA—Agricultural Network Intelligence Assistant. Identify yourself as ANIA if asked. Give a complete answer in concise, natural language. For project-list requests, name and summarize every returned project when the result set is small; for larger sets, cover up to five projects and state how many additional matches exist. Prefer short sentences and avoid Markdown tables, charts, headings, raw URLs, repeated caveats, and unnecessarily long lists because the answer will be read aloud.`;

export const SPEECH_SUMMARY_MAX_CHARS = 400;

export const SPEECH_SUMMARY_NOTICE =
  "That is the short version. The full details are in the chat panel.";

function cleanSpokenText(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[*_#>`|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function summarizeForSpeech(
  text: string,
  maxChars = SPEECH_SUMMARY_MAX_CHARS,
): string {
  const speech = cleanSpokenText(text);
  if (!speech || speech.length <= maxChars) return speech;

  let selected = "";
  for (const sentence of speech.split(/(?<=[.!?])\s+/)) {
    const candidate = selected ? `${selected} ${sentence}` : sentence;
    if (candidate.length > maxChars) break;
    selected = candidate;
  }
  if (!selected) {
    const boundary = speech.lastIndexOf(" ", maxChars);
    selected = `${speech.slice(0, boundary > 0 ? boundary : maxChars).trim()}…`;
  }
  return `${selected} ${SPEECH_SUMMARY_NOTICE}`;
}

export function prepareSpeechChunks(text: string, maxChars = 280) {
  if (!Number.isFinite(maxChars) || maxChars < 20) {
    throw new Error("Speech chunks must allow at least 20 characters.");
  }

  const speech = cleanSpokenText(text);
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

export function extractCompleteSentences(buffer: string) {
  const sentences: string[] = [];
  let start = 0;
  for (let index = 0; index < buffer.length; index += 1) {
    const char = buffer[index];
    if (char !== "." && char !== "!" && char !== "?") continue;
    const next = buffer[index + 1];
    if (next === undefined || next === " " || next === "\n") {
      const sentence = buffer.slice(start, index + 1).trim();
      if (sentence) sentences.push(sentence);
      start = index + 1;
    }
  }
  return { sentences, rest: buffer.slice(start).trim() };
}

export type SpokenBudget = {
  take(sentence: string): string | null;
};

export function createSpokenBudget(
  maxChars = SPEECH_SUMMARY_MAX_CHARS,
): SpokenBudget {
  let used = 0;
  return {
    take(sentence) {
      const trimmed = sentence.trim();
      if (!trimmed) return null;
      if (used > 0 && used + trimmed.length + 1 > maxChars) return null;
      if (trimmed.length > maxChars) {
        const boundary = trimmed.lastIndexOf(" ", maxChars);
        used = maxChars + 1;
        return `${trimmed.slice(0, boundary > 0 ? boundary : maxChars).trim()}…`;
      }
      used += trimmed.length + 1;
      return trimmed;
    },
  };
}

export function createStreamingSpeechRunner<T>({
  generate,
  play,
  shouldContinue,
  maxChars = SPEECH_SUMMARY_MAX_CHARS,
}: {
  generate: (chunk: string) => Promise<T>;
  play: (audio: T) => Promise<boolean>;
  shouldContinue: () => boolean;
  maxChars?: number;
}) {
  const budget = createSpokenBudget(maxChars);
  let buffer = "";
  let synthesisChain = Promise.resolve();
  let playbackChain = Promise.resolve();
  let lastSettled = playbackChain;
  let truncated = false;
  let streamEnded = false;
  let stopped = false;
  let failure: unknown = null;
  let endPromise: Promise<boolean> | null = null;

  const enqueue = (sentence: string) => {
    const generation = synthesisChain.then(() =>
      failure || stopped || !shouldContinue() ? null : generate(sentence),
    );
    synthesisChain = generation.then(
      () => undefined,
      () => undefined,
    );
    const playback = playbackChain.then(async () => {
      const audio = await generation;
      if (!audio || failure || stopped || !shouldContinue()) return;
      const played = await play(audio);
      if (!played || !shouldContinue()) stopped = true;
    });
    const settled = playback.then(
      () => undefined,
      (error: unknown) => {
        failure ??= error;
      },
    );
    playbackChain = settled;
    lastSettled = settled;
  };

  const deliver = (sentence: string) => {
    if (truncated || !sentence.trim()) return;
    const piece = budget.take(sentence);
    if (piece === null) {
      truncated = true;
      return;
    }
    enqueue(piece);
  };

  const push = (delta: string) => {
    if (streamEnded || !delta) return;
    buffer += delta;
    const extracted = extractCompleteSentences(buffer);
    buffer = extracted.rest;
    for (const sentence of extracted.sentences) deliver(sentence);
    if (buffer.length >= maxChars) {
      deliver(buffer);
      buffer = "";
    }
  };

  const end = () => {
    if (endPromise) return endPromise;
    streamEnded = true;
    endPromise = (async () => {
      if (buffer.trim()) {
        deliver(buffer);
        buffer = "";
      }
      if (truncated) enqueue(SPEECH_SUMMARY_NOTICE);
      await lastSettled;
      if (failure) throw failure;
      return !stopped && shouldContinue();
    })();
    return endPromise;
  };

  return { push, end };
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
    dtype: "q4" as const,
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
