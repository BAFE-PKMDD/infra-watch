"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

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
      role="img"
      aria-label="AI Assistant"
      className={cn(
        "group/bot-face relative block overflow-hidden rounded-full bg-white select-none transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-110 focus-visible:scale-110",
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
        className="object-contain transition-[opacity,transform] duration-150 ease-out group-hover/bot-face:scale-105 group-hover/bot-face:opacity-0 group-focus-visible/bot-face:scale-105 group-focus-visible/bot-face:opacity-0 group-hover/fab:scale-105 group-hover/fab:opacity-0 group-focus-visible/fab:scale-105 group-focus-visible/fab:opacity-0"
      />
      <Image
        src={botImages.open}
        alt=""
        fill
        sizes={sizes}
        priority={priority}
        draggable={false}
        className="object-contain opacity-0 scale-95 transition-[opacity,transform] duration-150 ease-out group-hover/bot-face:scale-105 group-hover/bot-face:opacity-100 group-focus-visible/bot-face:scale-105 group-focus-visible/bot-face:opacity-100 group-hover/fab:scale-105 group-hover/fab:opacity-100 group-focus-visible/fab:scale-105 group-focus-visible/fab:opacity-100"
      />
    </span>
  );
}

export function AiAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const toggleOpen = () => setIsOpen(!isOpen);

  const suggestions = [
    "AMSS projects in Aklan?",
    "Irrigation projects",
    "Ongoing projects?",
    "Check contractor details",
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mb-4 w-[350px] sm:w-[400px] overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 dark:bg-slate-950 dark:border-slate-800 flex flex-col origin-bottom-right"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-blue-900 px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 p-1 backdrop-blur-sm">
                  <Image
                    src="/bafe-logo.png"
                    alt="BAFE Logo"
                    width={32}
                    height={32}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <h3 className="font-bold leading-tight">INFRA Watch AI</h3>
                  <p className="text-xs text-blue-100">Ask about infrastructure projects</p>
                </div>
              </div>
              <button
                onClick={toggleOpen}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-blue-900 hover:bg-blue-50 transition-colors"
                aria-label="Close chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="mb-4">
                <BotFace className="h-16 w-16 border border-slate-200 shadow-sm" sizes="64px" />
              </div>
              <h4 className="mb-2 text-lg font-bold text-slate-800 dark:text-slate-100">
                Hello! I'm your INFRA Watch AI Assistant
              </h4>
              <p className="mb-6 text-sm text-slate-500 dark:text-slate-400 px-2">
                Ask me about infrastructure projects, budgets, or locations.
              </p>

              <div className="flex flex-wrap justify-center gap-2 mb-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInputValue(suggestion)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer / Input Area */}
            <div className="p-4 pt-0">
              <p className="mb-3 text-center text-[10px] italic text-slate-400 dark:text-slate-500">
                Maaaring magkamali ang AI Assistant. I-verify ang impormasyon.
              </p>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask about projects, budgets, locations..."
                  className="w-full rounded-full border border-slate-300 bg-slate-50 py-3 pl-4 pr-12 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-blue-500"
                />
                <button
                  className="absolute right-1 flex h-10 w-10 items-center justify-center rounded-full text-blue-600 hover:bg-blue-100 dark:text-blue-500 dark:hover:bg-slate-800 transition-colors"
                  disabled={!inputValue.trim()}
                >
                  <Send className={cn("h-5 w-5", !inputValue.trim() && "opacity-50")} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleOpen}
            className="group/fab flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-xl border border-slate-200 hover:bg-slate-50 transition-colors p-1"
            aria-label="Open AI Assistant"
          >
            <BotFace className="h-14 w-14" sizes="56px" priority />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
