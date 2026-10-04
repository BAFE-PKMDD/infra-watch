"use client";

import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getAutoReplySettings } from "@/actions/query/settings.query";
import { updateAutoReplySettings } from "@/actions/mutation/settings.mutation";
import type { AutoReplySettings } from "@/types/auto-reply.types";
import { DEFAULT_AUTO_REPLY_SETTINGS } from "@/types/auto-reply.types";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<{ text: string; tone: "success" | "error" } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["auto-reply-settings"],
    queryFn: async () => {
      const result = await getAutoReplySettings();
      return result.data;
    },
  });

  const [enabled, setEnabled] = useState(DEFAULT_AUTO_REPLY_SETTINGS.issues.enabled);
  const [issueMessage, setIssueMessage] = useState(DEFAULT_AUTO_REPLY_SETTINGS.issues.message);
  const [feedbackEnabled, setFeedbackEnabled] = useState(DEFAULT_AUTO_REPLY_SETTINGS.feedback.enabled);
  const [feedbackMessage, setFeedbackMessage] = useState(DEFAULT_AUTO_REPLY_SETTINGS.feedback.message);

  // Sync local form state from the loaded settings during render (React's render-time
  // state-adjustment pattern) instead of an effect, which would cause an extra cascading
  // render — same approach used in report-issue-form.tsx.
  const [lastLoadedData, setLastLoadedData] = useState(data);
  if (data && data !== lastLoadedData) {
    setLastLoadedData(data);
    setEnabled(data.issues.enabled);
    setIssueMessage(data.issues.message);
    setFeedbackEnabled(data.feedback.enabled);
    setFeedbackMessage(data.feedback.message);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: AutoReplySettings = {
        ...(data ?? DEFAULT_AUTO_REPLY_SETTINGS),
        issues: { enabled, message: issueMessage },
        feedback: { enabled: feedbackEnabled, message: feedbackMessage },
      };
      const result = await updateAutoReplySettings(payload);
      if (!result.success) throw new Error(result.error || "Failed to save settings");
      return result;
    },
    onSuccess: () => {
      setMessage({ text: "Auto-reply settings saved.", tone: "success" });
      void queryClient.invalidateQueries({ queryKey: ["auto-reply-settings"] });
    },
    onError: (mutationError: Error) => {
      setMessage({ text: mutationError.message, tone: "error" });
    },
  });

  return (
    <AdminPageWrapper
      breadcrumbs={[{ label: "Admin" }, { label: "Settings" }]}
      title="System Settings"
      description="Configure site-wide automation for E-Report and feedback submissions."
    >
      {message && (
        <div
          className={
            message.tone === "success"
              ? "rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
              : "rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          }
        >
          {message.text}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <AlertCircle className="mt-0.5 size-4" />
          {error instanceof Error ? error.message : "Failed to load settings"}
        </div>
      )}

      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-950 dark:text-white">Issue Acknowledgment &amp; Auto-Accept</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              When enabled, newly submitted E-Reports skip the manual staff acceptance step and move straight to
              &quot;Under Review&quot;, with the acknowledgment message below posted automatically. Submissions already
              pass automated text (profanity) and image (NSFW) checks before this point — this toggle only controls
              whether a staff member also has to manually accept them first.
            </p>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-amber-700 dark:text-amber-400">
              This also auto-publishes the citizen&apos;s own description, unedited, to the public E-Reports directory
              (reports with descriptions under 20 characters are skipped for publishing, but still auto-accepted
              internally). A moderator can still edit or unpublish it afterward from the issue&apos;s Respond panel.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} disabled={isLoading} aria-label="Toggle issue auto-accept" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="issue-ack-message" className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Acknowledgment Message
          </Label>
          <Textarea
            id="issue-ack-message"
            value={issueMessage}
            onChange={(event) => setIssueMessage(event.target.value)}
            disabled={isLoading}
            className="min-h-28 border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>

      </section>

      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-950 dark:text-white">Feedback Acknowledgment &amp; Auto-Accept</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              When enabled, newly submitted project feedback skips moderator approval and is published to the
              project page immediately, with the acknowledgment message below sent to the submitter. This replaces
              the old 5-minute-delayed acknowledgment notice — that sweep is retired and this is now the only
              acknowledgment path. Feedback text and images already pass automated content checks before this point.
            </p>
          </div>
          <Switch checked={feedbackEnabled} onCheckedChange={setFeedbackEnabled} disabled={isLoading} aria-label="Toggle feedback auto-accept" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="feedback-ack-message" className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Acknowledgment Message
          </Label>
          <Textarea
            id="feedback-ack-message"
            value={feedbackMessage}
            onChange={(event) => setFeedbackMessage(event.target.value)}
            disabled={isLoading}
            className="min-h-28 border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || isLoading}>
          {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {saveMutation.isPending ? "Saving..." : "Save Auto-reply Settings"}
        </Button>
      </div>
    </AdminPageWrapper>
  );
}
