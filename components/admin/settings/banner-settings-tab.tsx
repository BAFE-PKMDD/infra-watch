"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { BannerBar } from "@/components/site-notices/banner-bar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getBannerSettings } from "@/actions/query/settings.query";
import { updateBannerSettings } from "@/actions/mutation/settings.mutation";
import { MIN_BANNER_CONTRAST, SITE_NOTICES_QUERY_KEY, bannerContrastError, contrastRatio } from "@/lib/site-notices";
import { DEFAULT_BANNER_SETTINGS, type BannerSettings } from "@/types/banner.types";
import { SettingsMessage, type SettingsMessageValue } from "./settings-message";

const MAX_MESSAGE_LENGTH = 300;

export function BannerSettingsTab({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<SettingsMessageValue>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["banner-settings"],
    queryFn: async () => (await getBannerSettings()).data,
  });

  const [isEnabled, setIsEnabled] = useState(DEFAULT_BANNER_SETTINGS.isEnabled);
  const [bannerMessage, setBannerMessage] = useState(DEFAULT_BANNER_SETTINGS.message);
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_BANNER_SETTINGS.backgroundColor);
  const [textColor, setTextColor] = useState(DEFAULT_BANNER_SETTINGS.textColor);

  // Render-time sync from the loaded settings (see auto-reply-settings-tab.tsx for why).
  const [lastLoaded, setLastLoaded] = useState<BannerSettings | undefined>(undefined);
  if (data && data !== lastLoaded) {
    setLastLoaded(data);
    setIsEnabled(data.isEnabled);
    setBannerMessage(data.message);
    setBackgroundColor(data.backgroundColor);
    setTextColor(data.textColor);
  }

  const trimmedMessage = bannerMessage.trim();
  const contrastError = bannerContrastError({ backgroundColor, textColor });
  const ratio = contrastRatio(backgroundColor, textColor);
  const messageError = trimmedMessage.length === 0 ? "Enter the message to show." : null;
  const controlsDisabled = isLoading || !canEdit;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const result = await updateBannerSettings({ isEnabled, message: trimmedMessage, backgroundColor, textColor });
      if (!result.success) throw new Error(result.error || "Failed to save banner");
      return result;
    },
    onSuccess: () => {
      setMessage({
        text: isEnabled ? "Banner saved. It is now showing on the public pages." : "Banner saved. It is hidden from the public pages.",
        tone: "success",
      });
      void queryClient.invalidateQueries({ queryKey: ["banner-settings"] });
      void queryClient.invalidateQueries({ queryKey: SITE_NOTICES_QUERY_KEY });
    },
    onError: (mutationError: Error) => {
      setMessage({ text: mutationError.message, tone: "error" });
    },
  });

  return (
    <div className="space-y-6">
      <SettingsMessage message={message} />

      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-950 dark:text-white">Public Banner</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              A short message shown at the top of the public pages, for example about a schedule, an event, or a
              service notice. Visitors can dismiss it for their browser session. It is not shown on sign-in,
              citizen, or admin pages.
            </p>
          </div>
          <Switch checked={isEnabled} onCheckedChange={setIsEnabled} disabled={controlsDisabled} aria-label="Show the public banner" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="banner-message" className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Message
          </Label>
          <Textarea
            id="banner-message"
            value={bannerMessage}
            onChange={(event) => setBannerMessage(event.target.value)}
            maxLength={MAX_MESSAGE_LENGTH}
            disabled={controlsDisabled}
            aria-describedby="banner-message-help"
            className="min-h-24 border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          <p id="banner-message-help" className="text-xs text-slate-500 dark:text-slate-400">
            {bannerMessage.length}/{MAX_MESSAGE_LENGTH} characters. Plain text only.
          </p>
          {messageError ? <p className="text-xs font-semibold text-red-700 dark:text-red-300">{messageError}</p> : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField id="banner-background" label="Background color" value={backgroundColor} onChange={setBackgroundColor} disabled={controlsDisabled} />
          <ColorField id="banner-text" label="Text color" value={textColor} onChange={setTextColor} disabled={controlsDisabled} />
        </div>

        <p
          className={
            contrastError
              ? "text-xs font-semibold text-red-700 dark:text-red-300"
              : "text-xs font-semibold text-emerald-700 dark:text-emerald-300"
          }
          aria-live="polite"
        >
          {contrastError
            ? contrastError
            : `Readable: contrast ${ratio?.toFixed(1)}:1 (needs at least ${MIN_BANNER_CONTRAST}:1).`}
        </p>

        <div className="space-y-1.5">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Preview</p>
          <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            <BannerBar
              message={trimmedMessage || DEFAULT_BANNER_SETTINGS.message}
              backgroundColor={backgroundColor}
              textColor={textColor}
              label="Banner preview"
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || controlsDisabled || Boolean(contrastError) || Boolean(messageError)}
        >
          {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {saveMutation.isPending ? "Saving..." : "Save Banner"}
        </Button>
      </div>
    </div>
  );
}

function ColorField({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-bold text-slate-700 dark:text-slate-300">
        {label}
      </Label>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-11 w-14 cursor-pointer rounded-md border border-slate-200 bg-white p-1 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
        />
        <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">{value.toUpperCase()}</code>
      </div>
    </div>
  );
}
