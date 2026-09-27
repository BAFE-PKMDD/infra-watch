"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LANGUAGE_COOKIE } from "@/i18n/translate";
import { Language } from "@/i18n/translations";

function readLanguageCookie() {
  return document.cookie.split("; ").find((part) => part.startsWith(`${LANGUAGE_COOKIE}=`))?.split("=")[1];
}

// Server components read this cookie (i18n/server.ts); localStorage stays the client's source.
function writeLanguageCookie(lang: Language) {
  document.cookie = `${LANGUAGE_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("language") as Language;
    queueMicrotask(() => {
      if (stored === "en" || stored === "tl") {
        setLanguageState(stored);
        if (readLanguageCookie() !== stored) {
          writeLanguageCookie(stored);
          router.refresh();
        }
      }
      setMounted(true);
    });
  }, [router]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
    document.documentElement.lang = lang;
    if (readLanguageCookie() !== lang) {
      writeLanguageCookie(lang);
      router.refresh();
    }
  };

  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = language;
    }
  }, [language, mounted]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isDialogOpen, setIsDialogOpen }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
