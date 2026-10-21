// Per-turn latency marks for the ANIA voice pipeline. Each mark is milliseconds
// since the turn started (recording stopped); `report` also derives the gap
// between consecutive stages so the slow hop is obvious.

export type VoiceTurnStage =
  | "recording_stopped"
  | "transcript_ready"
  | "first_token"
  | "first_audio"
  | "speech_ended";

export type VoiceTurnTimingReport = {
  stages: Partial<Record<VoiceTurnStage, number>>;
  gaps: Partial<Record<VoiceTurnStage, number>>;
  serverTranscribeMs?: number;
};

const STAGE_ORDER: VoiceTurnStage[] = [
  "recording_stopped",
  "transcript_ready",
  "first_token",
  "first_audio",
  "speech_ended",
];

export function createVoiceTurnTimer(now: () => number = () => performance.now()) {
  const marks = new Map<VoiceTurnStage, number>();
  let serverTranscribeMs: number | undefined;

  return {
    mark(stage: VoiceTurnStage) {
      // Only the first occurrence counts (e.g. first_token fires on every delta).
      if (!marks.has(stage)) marks.set(stage, now());
    },
    setServerTranscribeMs(value: number | undefined) {
      if (value !== undefined && Number.isFinite(value)) serverTranscribeMs = value;
    },
    report(): VoiceTurnTimingReport {
      const start = marks.get("recording_stopped") ?? now();
      const stages: VoiceTurnTimingReport["stages"] = {};
      const gaps: VoiceTurnTimingReport["gaps"] = {};
      let previous = start;
      for (const stage of STAGE_ORDER) {
        const at = marks.get(stage);
        if (at === undefined) continue;
        stages[stage] = Math.round(at - start);
        gaps[stage] = Math.round(at - previous);
        previous = at;
      }
      return { stages, gaps, serverTranscribeMs };
    },
  };
}

export function parseServerTimingMs(header: string | null, name: string) {
  if (!header) return undefined;
  for (const entry of header.split(",")) {
    const [metric, ...params] = entry.trim().split(";");
    if (metric !== name) continue;
    const duration = params.find((param) => param.trim().startsWith("dur="));
    const value = duration ? Number(duration.trim().slice(4)) : Number.NaN;
    return Number.isFinite(value) ? value : undefined;
  }
  return undefined;
}

export function isVoiceTimingEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_VOICE_TIMING === "true"
  );
}

export function logVoiceTurnTiming(report: VoiceTurnTimingReport) {
  if (!isVoiceTimingEnabled()) return;
  console.info("[ANIA timing]", JSON.stringify(report));
}
