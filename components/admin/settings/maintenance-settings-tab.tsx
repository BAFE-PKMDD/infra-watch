"use client";

import { useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getMaintenanceMode } from "@/actions/query/settings.query";
import { setMaintenanceMode } from "@/actions/mutation/settings.mutation";
import { SITE_NOTICES_QUERY_KEY } from "@/lib/site-notices";
import { SettingsMessage, type SettingsMessageValue } from "./settings-message";

export function MaintenanceSettingsTab({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<SettingsMessageValue>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: saved, isLoading } = useQuery({
    queryKey: ["maintenance-mode"],
    queryFn: async () => (await getMaintenanceMode()).data,
  });

  const [enabled, setEnabled] = useState(false);
  // Render-time sync from the loaded value (see auto-reply-settings-tab.tsx for why).
  const [lastLoaded, setLastLoaded] = useState<boolean | undefined>(undefined);
  if (saved !== undefined && saved !== lastLoaded) {
    setLastLoaded(saved);
    setEnabled(saved);
  }

  const hasChanges = saved !== undefined && enabled !== saved;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const result = await setMaintenanceMode(enabled);
      if (!result.success) throw new Error(result.error || "Failed to save maintenance mode");
      return result;
    },
    onSuccess: () => {
      setMessage({
        text: enabled ? "Maintenance mode is on. Visitors and citizens now see the maintenance notice." : "Maintenance mode is off. The site is open to everyone.",
        tone: "success",
      });
      void queryClient.invalidateQueries({ queryKey: ["maintenance-mode"] });
      void queryClient.invalidateQueries({ queryKey: SITE_NOTICES_QUERY_KEY });
    },
    onError: (mutationError: Error) => {
      setMessage({ text: mutationError.message, tone: "error" });
    },
  });

  const requestSave = () => {
    // Switching it on locks the public out, so ask first. Switching it off needs no confirmation.
    if (enabled) {
      setConfirmOpen(true);
      return;
    }
    saveMutation.mutate();
  };

  const controlsDisabled = isLoading || !canEdit;

  return (
    <div className="space-y-6">
      <SettingsMessage message={message} />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 border-b border-red-100 bg-red-50 px-6 py-4 dark:border-red-950 dark:bg-red-950/30">
          <ShieldAlert className="size-5 text-red-700 dark:text-red-300" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-extrabold text-slate-950 dark:text-white">Maintenance Mode</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">Show a maintenance notice to the public</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <h3 className="text-base font-bold text-slate-950 dark:text-white">Enable Maintenance Mode</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Visitors and citizens see a notice that covers the page and cannot be dismissed. Administrators,
              regional administrators, and moderators are not affected, and the sign-in page stays reachable so
              staff can still log in.
            </p>
            <p className="mt-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
              This hides the pages from people. It does not block requests to the system itself, so it is not a
              substitute for taking the site offline during a risky change.
            </p>
            <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200" aria-live="polite">
              Current status: {isLoading ? "Loading..." : saved ? "On (the public sees the notice)" : "Off (the site is open)"}
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            disabled={controlsDisabled}
            aria-label="Toggle maintenance mode"
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="button" onClick={requestSave} disabled={saveMutation.isPending || controlsDisabled || !hasChanges}>
          {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {saveMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Turn on maintenance mode?</AlertDialogTitle>
            <AlertDialogDescription>
              Visitors and citizens will immediately see the maintenance notice and will not be able to use the
              site until you turn it off. Staff are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => saveMutation.mutate()}>Turn on</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
