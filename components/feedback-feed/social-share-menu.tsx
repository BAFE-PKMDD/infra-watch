"use client";

import { useState, useSyncExternalStore } from "react";
import { Share2, Link as LinkIcon, Check } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/i18n";

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const XTwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.115.553 4.179 1.603 5.998L.068 24l6.174-1.619a12.02 12.02 0 005.789 1.488h.005c6.645 0 12.028-5.385 12.028-12.031C24.064 5.385 18.681 0 12.031 0zm0 22.025h-.004a10.02 10.02 0 01-5.109-1.393l-.366-.217-3.799.996 1.014-3.703-.238-.379a10.03 10.03 0 01-1.536-5.3c0-5.541 4.508-10.048 10.052-10.048 2.684 0 5.207 1.045 7.104 2.943a10.003 10.003 0 012.939 7.106c0 5.541-4.508 10.048-10.047 10.048zm5.503-7.519c-.302-.151-1.787-.882-2.064-.982-.277-.101-.479-.151-.681.151-.202.302-.782.982-.958 1.184-.176.202-.353.227-.655.076-.302-.151-1.276-.47-2.43-1.499-.899-.801-1.505-1.791-1.681-2.093-.176-.302-.019-.465.132-.616.136-.136.302-.353.454-.529.151-.176.202-.302.302-.504.101-.202.05-.378-.025-.529-.076-.151-.681-1.641-.933-2.247-.245-.59-.494-.51-.681-.52l-.58-.01c-.202 0-.529.076-.806.378-.277.302-1.059 1.034-1.059 2.522s1.084 2.925 1.235 3.127c.151.202 2.133 3.256 5.167 4.566.721.312 1.284.499 1.724.638.725.23 1.384.197 1.905.12.58-.087 1.787-.73 2.039-1.435.252-.705.252-1.309.176-1.435-.076-.126-.277-.202-.579-.353z" />
  </svg>
);

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
  </svg>
);

const TelegramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.832.942z" />
  </svg>
);

interface SocialShareMenuProps {
  url?: string;
  title: string;
  text?: string;
  className?: string;
}

const subscribe = () => () => {};

export function SocialShareMenu({
  url,
  title,
  text,
  className,
}: SocialShareMenuProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  const shareUrl = mounted
    ? (url ? (url.startsWith("http") ? url : `${window.location.origin}${url}`) : window.location.href)
    : "";

  const shareText = text || title || t("community.share.defaultText");

  const handleShareFacebook = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(fbUrl, "_blank", "width=640,height=520,noopener,noreferrer");
  };

  const handleShareX = () => {
    const xUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(xUrl, "_blank", "width=640,height=520,noopener,noreferrer");
  };

  const handleShareWhatsApp = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} - ${shareUrl}`)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const handleShareLinkedIn = () => {
    const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(liUrl, "_blank", "width=640,height=520,noopener,noreferrer");
  };

  const handleShareTelegram = () => {
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(tgUrl, "_blank", "width=640,height=520,noopener,noreferrer");
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Native share failed:", error);
          toast.error(t("community.share.failed"));
        }
      }
    }
  };

  const handleCopyLink = async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast.success(t("community.common.linkCopiedToast"));
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error("Copy link failed:", error);
        toast.error(t("community.common.copyLinkFailed"));
      }
    }
  };

  const hasNativeShare = mounted && typeof navigator !== "undefined" && Boolean(navigator.share);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={
          className ||
          "flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1877F2]"
        }
        aria-label={t("community.share.menuLabel")}
      >
        <Share2 className="w-4.5 h-4.5" />
        <span>{t("community.share.share")}</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side="top"
        className="w-56 p-1.5 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] z-[9999]"
      >
        <div className="px-2.5 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {t("community.share.heading")}
        </div>

        {/* Facebook */}
        <DropdownMenuItem
          onClick={handleShareFacebook}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
        >
          <FacebookIcon className="w-4 h-4 text-[#1877F2]" />
          <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
            {t("community.share.shareOn", { platform: "Facebook" })}
          </span>
        </DropdownMenuItem>

        {/* X / Twitter */}
        <DropdownMenuItem
          onClick={handleShareX}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
        >
          <XTwitterIcon className="w-4 h-4 text-slate-900 dark:text-slate-100" />
          <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
            {t("community.share.shareOn", { platform: "X (Twitter)" })}
          </span>
        </DropdownMenuItem>

        {/* WhatsApp */}
        <DropdownMenuItem
          onClick={handleShareWhatsApp}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
        >
          <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
          <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
            {t("community.share.shareOn", { platform: "WhatsApp" })}
          </span>
        </DropdownMenuItem>

        {/* LinkedIn */}
        <DropdownMenuItem
          onClick={handleShareLinkedIn}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
        >
          <LinkedinIcon className="w-4 h-4 text-[#0A66C2]" />
          <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
            {t("community.share.shareOn", { platform: "LinkedIn" })}
          </span>
        </DropdownMenuItem>

        {/* Telegram */}
        <DropdownMenuItem
          onClick={handleShareTelegram}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
        >
          <TelegramIcon className="w-4 h-4 text-[#229ED9]" />
          <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
            {t("community.share.shareOn", { platform: "Telegram" })}
          </span>
        </DropdownMenuItem>

        {/* Native mobile/device share option */}
        {hasNativeShare && (
          <DropdownMenuItem
            onClick={handleNativeShare}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
          >
            <Share2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
              {t("community.share.moreOptions")}
            </span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="my-1 border-t border-slate-100 dark:border-slate-800" />

        {/* Copy Link */}
        <DropdownMenuItem
          onClick={handleCopyLink}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {t("community.common.linkCopied")}
              </span>
            </>
          ) : (
            <>
              <LinkIcon className="w-4 h-4 text-slate-500" />
              <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
                {t("community.common.copyLink")}
              </span>
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
