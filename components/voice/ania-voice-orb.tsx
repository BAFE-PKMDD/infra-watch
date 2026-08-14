"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { VoiceAssistantStatus } from "@/lib/voice/state";

const APPEARANCE: Record<VoiceAssistantStatus, { core: string; ring: string }> = {
  idle: { core: "from-slate-500 to-slate-700", ring: "border-slate-500/30" },
  reconnecting: { core: "from-amber-300 to-orange-500", ring: "border-amber-300/50" },
  listening_for_wake_word: { core: "from-cyan-400 to-blue-600", ring: "border-cyan-400/50" },
  recording: { core: "from-rose-400 to-red-600", ring: "border-rose-400/60" },
  transcribing: { core: "from-violet-400 to-purple-600", ring: "border-violet-400/50" },
  thinking: { core: "from-amber-300 to-orange-500", ring: "border-amber-300/50" },
  preparing_speech: { core: "from-teal-300 to-cyan-600", ring: "border-teal-300/50" },
  speaking: { core: "from-emerald-300 to-cyan-500", ring: "border-emerald-300/60" },
};

export function AniaVoiceOrb({
  status,
  className,
}: {
  status: VoiceAssistantStatus;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const active = status !== "idle";
  const appearance = APPEARANCE[status];

  return (
    <span className={cn("relative inline-flex h-9 w-9 items-center justify-center", className)} aria-hidden="true">
      <motion.span
        className={cn("absolute inset-0 rounded-full border", appearance.ring)}
        animate={
          active && !reduceMotion
            ? { scale: [0.9, 1.35], opacity: [0.75, 0] }
            : { scale: 1, opacity: active ? 0.45 : 0.2 }
        }
        transition={{ duration: 1.5, repeat: active ? Infinity : 0, ease: "easeOut" }}
      />
      <motion.span
        className={cn("h-5 w-5 rounded-full bg-gradient-to-br shadow-lg", appearance.core)}
        animate={
          active && !reduceMotion
            ? { scale: [0.9, 1.08, 0.96], filter: ["brightness(1)", "brightness(1.35)", "brightness(1)"] }
            : undefined
        }
        transition={{ duration: status === "recording" ? 0.65 : 1.6, repeat: Infinity }}
      />
      <span className="absolute h-1.5 w-1.5 -translate-x-1 -translate-y-1 rounded-full bg-white/80 blur-[0.5px]" />
    </span>
  );
}
