"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  KeyboardEvent,
} from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Mic, MicOff, X, Send, RotateCcw } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { AiMessageContent } from "@/components/ai-message-content";
import {
  appendToLastAssistantMessage,
  ensureAssistantMessage,
  type ChatMessage,
} from "@/lib/chat-messages";
import { useVoiceAssistant } from "@/hooks/use-voice-assistant";
import { AniaVoiceOrb } from "@/components/voice/ania-voice-orb";
import type { VoiceAssistantClientConfig } from "@/lib/voice/config";

const botImages = {
  closed: "/b-bot-close-eye.png",
  open: "/b-bot-open-eye.png",
};

function BotFace({
  className,
  sizes = "64px",
  priority = false,
}: {
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "group/bot-face relative block overflow-hidden rounded-full bg-white select-none transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-110 focus-visible:scale-110 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:focus-visible:scale-100",
        className,
      )}
    >
      <Image
        src={botImages.closed}
        alt=""
        fill
        sizes={sizes}
        priority={priority}
        draggable={false}
        className="object-contain transition-[opacity,transform] duration-150 ease-out group-hover/bot-face:scale-105 group-hover/bot-face:opacity-0 group-focus-visible/bot-face:scale-105 group-focus-visible/bot-face:opacity-0 group-hover/fab:scale-105 group-hover/fab:opacity-0 group-focus-visible/fab:scale-105 group-focus-visible/fab:opacity-0 motion-reduce:transform-none motion-reduce:transition-none"
      />
      <Image
        src={botImages.open}
        alt=""
        fill
        sizes={sizes}
        priority={priority}
        draggable={false}
        className="object-contain opacity-0 scale-95 transition-[opacity,transform] duration-150 ease-out group-hover/bot-face:scale-105 group-hover/bot-face:opacity-100 group-focus-visible/bot-face:scale-105 group-focus-visible/bot-face:opacity-100 group-hover/fab:scale-105 group-hover/fab:opacity-100 group-focus-visible/fab:scale-105 group-focus-visible/fab:opacity-100 motion-reduce:transform-none motion-reduce:transition-none"
      />
    </span>
  );
}

const SUGGESTIONS = [
  "Show ongoing projects in Aklan",
  "Summarize projects by status",
  "Show AMEFIP projects in Region VI",
  "Show 10 ongoing projects with contractors",
];

export function AiAssistantWidget({
  voiceConfig,
  adminMode = false,
}: {
  voiceConfig?: VoiceAssistantClientConfig;
  adminMode?: boolean;
} = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);
  const hasOpenedRef = useRef(false);
  const conversationIdRef = useRef(crypto.randomUUID());
  const safeVoiceConfig = voiceConfig ?? {
    enabled: false,
    wakeWord: "hey_ania",
    wakeWordWsUrl: "",
    kokoroModel: "onnx-community/Kokoro-82M-v1.0-ONNX",
    kokoroVoice: "af_heart",
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: shouldReduceMotion ? "auto" : "smooth",
      block: "end",
      inline: "nearest",
    });
  }, [shouldReduceMotion]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      hasOpenedRef.current = true;
      inputRef.current?.focus();
      return;
    }

    if (hasOpenedRef.current) {
      const focusTimer = window.setTimeout(() => launcherRef.current?.focus(), 0);
      return () => window.clearTimeout(focusTimer);
    }
  }, [isOpen]);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  const handleSend = useCallback(
    async (textToSend?: string, responseMode: "text" | "voice" = "text") => {
      const text = textToSend ?? inputValue;
      if (!text.trim() || isLoading) return;

      setInputValue("");
      const newMessages = [
        ...messages,
        { role: "user", content: text } as ChatMessage,
      ];
      setMessages(newMessages);
      setIsLoading(true);

      const requestId = crypto.randomUUID();
      const controller = new AbortController();
      let timedOut = false;
      activeRequestIdRef.current = requestId;
      abortControllerRef.current?.abort();
      abortControllerRef.current = controller;
      const timeoutId = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, 58_000);

      let assistantText = "";
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: conversationIdRef.current,
            message: text.trim(),
            responseMode,
            surface: adminMode ? "ania" : "public",
          }),
          signal: controller.signal,
        });

        if (activeRequestIdRef.current !== requestId) return;

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          throw new Error(errorBody?.error ?? "Failed to send message. Please try again.");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader available");

        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (activeRequestIdRef.current !== requestId) {
            await reader.cancel();
            return;
          }
          const chunk = decoder.decode(value, { stream: true });
          assistantText += chunk;

          setMessages((prev) => appendToLastAssistantMessage(prev, chunk));
        }
        return assistantText;
      } catch (error) {
        if (activeRequestIdRef.current !== requestId) return;
        const errorMessage = controller.signal.aborted
          ? timedOut
            ? "The response timed out. Please try again."
            : "Response cancelled."
          : error instanceof Error
            ? error.message
            : "Sorry, I encountered an error processing your request.";
        setMessages((prev) => ensureAssistantMessage(prev, errorMessage));
      } finally {
        window.clearTimeout(timeoutId);
        if (activeRequestIdRef.current === requestId) {
          activeRequestIdRef.current = null;
          abortControllerRef.current = null;
          setIsLoading(false);
        }
      }
    },
    [adminMode, inputValue, messages, isLoading],
  );

  const handleClose = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsOpen(false);
  }, []);

  const voice = useVoiceAssistant({
    config: safeVoiceConfig,
    submitCommand: (text) => handleSend(text, "voice"),
    cancelCommand: () => abortControllerRef.current?.abort(),
    onWakeDetected: () => setIsOpen(true),
    onTranscription: setInputValue,
    onSleep: handleClose,
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [handleClose, isOpen]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    handleSend(suggestion);
  };

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            ref={launcherRef}
            initial={false}
            animate={{ scale: 1 }}
            exit={shouldReduceMotion ? undefined : { scale: 0 }}
            whileHover={shouldReduceMotion ? undefined : { scale: 1.12 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 400, damping: 17 }
            }
            onClick={() => setIsOpen(true)}
            className="group/fab fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-xl border border-slate-200 hover:bg-slate-50 transition-colors p-1"
            aria-label={
              adminMode && safeVoiceConfig.enabled
                ? `Open ANIA. ${voice.statusLabel}`
                : adminMode
                  ? "Open ANIA"
                  : "Open InfraWatch AI"
            }
          >
            <BotFace className="h-14 w-14" sizes="56px" priority />
            {adminMode && safeVoiceConfig.enabled && (
              <span
                className="absolute -bottom-7 right-0 flex min-w-max items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                role="status"
                aria-live="polite"
              >
                <AniaVoiceOrb status={voice.status} className="h-3 w-3" />
                {voice.statusLabel}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Widget */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 300, damping: 25 }
            }
            className="fixed bottom-6 right-6 z-50 flex h-[640px] max-h-[calc(100vh-3rem)] w-[440px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-slate-950 dark:ring-white/10"
            role="dialog"
            aria-modal="false"
            aria-labelledby={adminMode ? "ania-title" : "infra-watch-ai-title"}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-white/50 px-4 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/50">
              <div className="flex items-center gap-3">
                <BotFace className="h-10 w-10 ring-2 ring-slate-100 dark:ring-slate-800" />
                <div>
                  <h3
                    id={adminMode ? "ania-title" : "infra-watch-ai-title"}
                    className="font-semibold text-slate-900 dark:text-white"
                  >
                    {adminMode ? "ANIA" : "InfraWatch AI"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {adminMode ? "Agricultural Network Intelligence Assistant" : "Ask about projects"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={() => {
                      setMessages([]);
                      conversationIdRef.current = crypto.randomUUID();
                    }}
                    disabled={isLoading}
                    className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-slate-300 dark:focus-visible:bg-slate-800"
                    aria-label="Clear messages"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300 dark:focus-visible:bg-slate-800"
                  aria-label={adminMode ? "Close ANIA" : "Close InfraWatch AI"}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div
              className="flex-1 space-y-4 overflow-y-auto p-4 [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin]"
              role="log"
              aria-live="off"
              aria-label={adminMode ? "ANIA conversation" : "InfraWatch AI conversation"}
            >
              {messages.length === 0 ? (
                <div className="flex flex-col h-full items-center justify-center text-center space-y-6">
                  <div className="space-y-2">
                    <h4 className="font-medium text-slate-900 dark:text-white">How can I help you today?</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[250px]">
                      Ask about project locations, status, budgets, or contractors.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex gap-3",
                        msg.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      {msg.role === "assistant" && (
                        <div className="flex-shrink-0 mt-1">
                          <BotFace className="h-6 w-6 ring-1 ring-slate-100 dark:ring-slate-800" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "min-w-0 text-sm",
                          msg.role === "user"
                            ? "max-w-[82%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-blue-900 px-4 py-2.5 text-white"
                            : "w-full max-w-[calc(100%-2rem)] rounded-2xl rounded-bl-sm border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        )}
                      >
                        {msg.role === "assistant" ? (
                          <AiMessageContent
                            content={msg.content}
                            isStreaming={isLoading && idx === messages.length - 1}
                          />
                        ) : (
                          msg.content
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && messages[messages.length - 1]?.role === "user" && (
                    <div className="flex gap-3 justify-start">
                      <div className="flex-shrink-0 mt-1">
                        <BotFace className="h-6 w-6 ring-1 ring-slate-100 dark:ring-slate-800" />
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3.5 flex items-center space-x-1">
                        <motion.div
                          animate={
                            shouldReduceMotion
                              ? { opacity: 0.7 }
                              : { opacity: [0.4, 1, 0.4] }
                          }
                          transition={{ repeat: Infinity, duration: 1.4, delay: 0 }}
                          className="h-1.5 w-1.5 rounded-full bg-slate-500"
                        />
                        <motion.div
                          animate={
                            shouldReduceMotion
                              ? { opacity: 0.7 }
                              : { opacity: [0.4, 1, 0.4] }
                          }
                          transition={{ repeat: Infinity, duration: 1.4, delay: 0.2 }}
                          className="h-1.5 w-1.5 rounded-full bg-slate-500"
                        />
                        <motion.div
                          animate={
                            shouldReduceMotion
                              ? { opacity: 0.7 }
                              : { opacity: [0.4, 1, 0.4] }
                          }
                          transition={{ repeat: Infinity, duration: 1.4, delay: 0.4 }}
                          className="h-1.5 w-1.5 rounded-full bg-slate-500"
                        />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <span className="sr-only" role="status" aria-live="polite">
              {isLoading
                ? `${adminMode ? "ANIA" : "InfraWatch AI"} is responding.`
                : messages.at(-1)?.role === "assistant"
                  ? `${adminMode ? "ANIA" : "InfraWatch AI"} response complete.`
                  : `${adminMode ? "ANIA" : "InfraWatch AI"} is ready.`}
            </span>

            {/* Input Area */}
            <div className="border-t border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="relative flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question..."
                  aria-label={adminMode ? "Ask ANIA a question" : "Ask InfraWatch AI a question"}
                  disabled={isLoading}
                  maxLength={4_000}
                  className={cn(
                    "w-full rounded-full border border-slate-200 bg-slate-50 py-3 pl-4 text-sm text-slate-900 placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-blue-500 dark:focus:ring-blue-500",
                    safeVoiceConfig.enabled ? "pr-20" : "pr-12",
                  )}
                />
                {safeVoiceConfig.enabled && (
                  <button
                    type="button"
                    onClick={voice.toggle}
                    className={cn(
                      "absolute right-11 flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                      voice.enabled
                        ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300"
                        : "text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800",
                    )}
                    aria-label={voice.enabled ? "Disable ANIA voice mode" : "Enable ANIA voice mode"}
                    aria-pressed={voice.enabled}
                    title="Toggle ANIA voice mode (Ctrl+Shift+V)"
                  >
                    {voice.enabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  </button>
                )}
                <button
                  onClick={() => handleSend()}
                  disabled={isLoading || !inputValue.trim()}
                  className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              {safeVoiceConfig.enabled && (
                <div
                  className="mt-2 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400"
                  role="status"
                  aria-live="polite"
                >
                  <AniaVoiceOrb status={voice.status} className="h-6 w-6" />
                  <span>{voice.statusLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span>Ctrl+Shift+V</span>
                </div>
              )}
              <p className="mt-2 text-center text-[10px] leading-4 text-slate-400 dark:text-slate-500">
                Messages are retained for service quality and analysis. Do not share
                passwords or sensitive personal information.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
