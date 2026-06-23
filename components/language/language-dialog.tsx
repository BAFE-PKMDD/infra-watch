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
import { Language } from "@/i18n/translations";

export function LanguageDialog() {
  const { language, setLanguage, isDialogOpen, setIsDialogOpen } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(language);
  const { t } = useTranslation();

  useEffect(() => {
    const hasSelected = localStorage.getItem("language_selected");
    if (!hasSelected) {
      setIsDialogOpen(true);
      setSelectedLanguage(language);
    }
  }, [language, setIsDialogOpen]);

  const handleConfirm = () => {
    setLanguage(selectedLanguage);
    localStorage.setItem("language_selected", "true");
    setIsDialogOpen(false);
  };

  const handleOpenChange = (open: boolean, event?: any) => {
    // If trying to close, check if they have confirmed a selection first
    if (!open) {
      const hasSelected = localStorage.getItem("language_selected");
      if (!hasSelected) return; // Prevent closing
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
            className={`justify-start gap-4 h-16 text-base border-2 transition-all ${selectedLanguage === "en"
              ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20"
              : "border-slate-200 dark:border-slate-800"
              }`}
            onClick={() => setSelectedLanguage("en")}
          >
            <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedLanguage === "en" ? "border-emerald-600" : "border-slate-300 dark:border-slate-600"
              }`}>
              {selectedLanguage === "en" && <div className="w-3 h-3 rounded-full bg-emerald-600 animate-in zoom-in duration-200" />}
            </div>
            <div className="flex flex-col items-start leading-tight">
              <span className="font-semibold">{t("languageDialog.english")}</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Standard English</span>
            </div>
          </Button>
          <Button
            variant="outline"
            className={`justify-start gap-4 h-16 text-base border-2 transition-all ${selectedLanguage === "tl"
              ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20"
              : "border-slate-200 dark:border-slate-800"
              }`}
            onClick={() => setSelectedLanguage("tl")}
          >
            <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedLanguage === "tl" ? "border-emerald-600" : "border-slate-300 dark:border-slate-600"
              }`}>
              {selectedLanguage === "tl" && <div className="w-3 h-3 rounded-full bg-emerald-600 animate-in zoom-in duration-200" />}
            </div>
            <div className="flex flex-col items-start leading-tight">
              <span className="font-semibold">{t("languageDialog.filipino")}</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Wikang Tagalog</span>
            </div>
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={handleConfirm} className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">
            {t("languageDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
