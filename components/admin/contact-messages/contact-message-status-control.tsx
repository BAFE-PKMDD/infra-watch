"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateContactMessageStatus } from "@/actions/mutation/contact.mutation";
import { CONTACT_MESSAGE_STATUSES, CONTACT_MESSAGE_STATUS_LABELS, type ContactMessageStatus } from "@/lib/contact-messages";
import { useTutorialSandbox } from "@/components/admin/tour/tutorial-sandbox";
import { runTutorialMutation } from "@/lib/tours/sandbox";
import { notifyTutorialAction } from "@/lib/tours/events";

export function ContactMessageStatusControl({ id, status }: { id: string; status: ContactMessageStatus }) {
  const sandbox = useTutorialSandbox();
  const [value, setValue] = useState<ContactMessageStatus>(status);
  const [isPending, startTransition] = useTransition();
  const selectId = `contact-status-${id}`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={selectId} className="text-sm font-medium text-slate-700 dark:text-slate-300">
        Status
      </label>
      <select
        id={selectId}
        data-tour="contact-status"
        value={value}
        disabled={isPending}
        onChange={(event) => {
          const next = event.target.value as ContactMessageStatus;
          const previous = value;
          setValue(next);
          startTransition(async () => {
            try {
              const { data: result, simulated } = await runTutorialMutation({
                sandbox: Boolean(sandbox), recordId: id,
                simulate: () => {
                  sandbox!.apply({ resource: "contact_messages", recordId: id, action: "status", status: next });
                  return { success: true, error: undefined };
                },
                persist: () => updateContactMessageStatus(id, next),
              });
              if (result.success) {
                if (simulated && next === "resolved") notifyTutorialAction({ resource: "contact_messages", recordId: id, action: "resolved", outcome: "success", simulated: true });
                toast.success(`${simulated ? "Example marked" : "Marked"} as ${CONTACT_MESSAGE_STATUS_LABELS[next].toLowerCase()}.`);
              } else {
                setValue(previous);
                toast.error(result.error ?? "Could not update the message.");
              }
            } catch (error) {
              setValue(previous);
              toast.error(error instanceof Error ? error.message : "Could not update the message.");
            }
          });
        }}
        className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        {CONTACT_MESSAGE_STATUSES.map((option) => (
          <option key={option} value={option}>
            {CONTACT_MESSAGE_STATUS_LABELS[option]}
          </option>
        ))}
      </select>
    </div>
  );
}
