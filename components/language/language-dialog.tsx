"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/providers/language-provider";
import { useTranslation } from "@/i18n";
import type { Language } from "@/i18n/translations";

export function LanguageDialog() {
  const { language, setLanguage, isDialogOpen, setIsDialogOpen } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);
  const currentSelection = selectedLanguage ?? language;
  const { t } = useTranslation();

  useEffect(() => {
    const hasSelected = localStorage.getItem("language_selected");
    if (!hasSelected) {
      setIsDialogOpen(true);
    }
  }, [setIsDialogOpen]);

  const handleConfirm = () => {
    setLanguage(currentSelection);
    localStorage.setItem("language_selected", "true");
    setSelectedLanguage(null);
    setIsDialogOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    // If trying to close, check if they have confirmed a selection first
    if (!open) {
      const hasSelected = localStorage.getItem("language_selected");
      if (!hasSelected) return; // Prevent closing
      setSelectedLanguage(null);
    }
    setIsDialogOpen(open);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800" 
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            🌐 {t("languageDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("languageDialog.subtitle")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 py-4">
          <Button
            variant="outline"
            className={`justify-start gap-4 h-16 text-base border-2 transition-all ${currentSelection === "en"
              ? "border-primary bg-primary/10 dark:bg-primary/20"
              : "border-slate-200 dark:border-slate-800"
              }`}
            onClick={() => setSelectedLanguage("en")}
          >
            <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${currentSelection === "en" ? "border-primary" : "border-slate-300 dark:border-slate-600"
              }`}>
              {currentSelection === "en" && <div className="w-3 h-3 rounded-full bg-primary animate-in zoom-in duration-200" />}
            </div>
            <div className="flex flex-col items-start leading-tight">
              <span className="font-semibold">{t("languageDialog.english")}</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Standard English</span>
            </div>
          </Button>
          <Button
            variant="outline"
            className={`justify-start gap-4 h-16 text-base border-2 transition-all ${currentSelection === "tl"
              ? "border-primary bg-primary/10 dark:bg-primary/20"
              : "border-slate-200 dark:border-slate-800"
              }`}
            onClick={() => setSelectedLanguage("tl")}
          >
            <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${currentSelection === "tl" ? "border-primary" : "border-slate-300 dark:border-slate-600"
              }`}>
              {currentSelection === "tl" && <div className="w-3 h-3 rounded-full bg-primary animate-in zoom-in duration-200" />}
            </div>
            <div className="flex flex-col items-start leading-tight">
              <span className="font-semibold">{t("languageDialog.filipino")}</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Wikang Tagalog</span>
            </div>
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={handleConfirm} className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground">
            {t("languageDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
