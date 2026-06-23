"use client";

import { useLanguage } from "@/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const { language, setIsDialogOpen } = useLanguage();

  const toggleLanguage = () => {
    setIsDialogOpen(true);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="gap-2 font-bold px-3 h-9 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white"
      title={language === "en" ? "Change Language" : "Baguhin ang Wika"}
    >
      <Globe className="w-4 h-4" />
      <span className="text-xs uppercase tracking-wider">
        {language === "en" ? "EN" : "TL"}
      </span>
    </Button>
  );
}
