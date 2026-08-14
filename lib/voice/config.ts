export type VoiceAssistantClientConfig = {
  enabled: boolean;
  wakeWord: string;
  wakeWordWsUrl: string;
  kokoroModel: string;
  kokoroVoice: string;
};

type VoiceEnvironment = {
  [key: string]: string | undefined;
  VOICE_ASSISTANT_ENABLED?: string;
  WAKE_WORD?: string;
  WAKE_WORD_WS_URL?: string;
  KOKORO_MODEL_PATH?: string;
  KOKORO_VOICE?: string;
};

export function isVoiceAssistantEnabled(
  environment: VoiceEnvironment = process.env,
) {
  return environment.VOICE_ASSISTANT_ENABLED?.trim().toLowerCase() === "true";
}

export function getVoiceAssistantConfig(
  environment: VoiceEnvironment = process.env,
): VoiceAssistantClientConfig {
  return {
    enabled: isVoiceAssistantEnabled(environment),
    wakeWord: environment.WAKE_WORD?.trim() || "hey_ania",
    wakeWordWsUrl: environment.WAKE_WORD_WS_URL?.trim() || "",
    kokoroModel:
      environment.KOKORO_MODEL_PATH?.trim() ||
      "onnx-community/Kokoro-82M-v1.0-ONNX",
    kokoroVoice: environment.KOKORO_VOICE?.trim() || "af_heart",
  };
}
