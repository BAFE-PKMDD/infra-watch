import { AiAssistantWidget } from "@/components/ai-assistant-widget";
import type { VoiceAssistantClientConfig } from "@/lib/voice/config";

export function AniaAssistant({
  config,
}: {
  config: VoiceAssistantClientConfig;
}) {
  return <AiAssistantWidget adminMode voiceConfig={config} />;
}
