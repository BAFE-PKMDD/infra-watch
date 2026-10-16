"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTranslation } from "@/i18n";
import { useLanguage } from "@/providers/language-provider";

const MarkdownContent = dynamic(() =>
  import("@/components/admin/content/markdown-content").then(
    (module) => module.MarkdownContent,
  ),
);
type Notice = { id: string; title: string; content: string; updatedAt: string };
export function AnnouncementDialog() {
  const { t } = useTranslation();
  const { isDialogOpen } = useLanguage();
  const [open, setOpen] = useState(false);
  const [dontShow, setDontShow] = useState(false);
  const { data } = useQuery({
    queryKey: ["active-announcement"],
    staleTime: 60000,
    refetchInterval: 60000,
    queryFn: async () => {
      const response = await fetch("/api/announcements/active", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Announcement unavailable");
      return response.json() as Promise<{ data: Notice | null }>;
    },
  });
  const notice = data?.data;
  const key = notice
    ? `announcement-dismissed:${notice.id}:${notice.updatedAt}`
    : "";
  useEffect(() => {
    if (!notice || isDialogOpen) return;
    let show = true;
    try {
      if (!localStorage.getItem("language_selected")) return;
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila",
      }).format(new Date());
      show = localStorage.getItem(key) !== today;
    } catch {
      /* A blocked storage API must not prevent displaying the notice. */
    }
    if (show) {
      const frame = requestAnimationFrame(() => {
        setOpen(true);
        setDontShow(false);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [notice, key, isDialogOpen]);
  function close(next: boolean) {
    if (!next && dontShow) {
      try {
        localStorage.setItem(
          key,
          new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(
            new Date(),
          ),
        );
      } catch {
        /* Dismissal still works without storage. */
      }
    }
    setOpen(next);
  }
  if (!notice) return null;
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{notice.title}</DialogTitle>
          <DialogDescription>
            {t("publicContent.announcement")}
          </DialogDescription>
        </DialogHeader>
        <MarkdownContent content={notice.content} />
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={dontShow}
            onChange={(event) => setDontShow(event.target.checked)}
            className="size-5 accent-primary"
          />
          {t("publicContent.dontShow")}
        </label>
        <Button
          className="min-h-11 focus-visible:outline-2 focus-visible:outline-primary"
          onClick={() => close(false)}
        >
          {t("publicContent.dismiss")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
