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
