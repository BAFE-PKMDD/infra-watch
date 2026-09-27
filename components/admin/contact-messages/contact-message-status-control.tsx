"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateContactMessageStatus } from "@/actions/mutation/contact.mutation";
import { CONTACT_MESSAGE_STATUSES, CONTACT_MESSAGE_STATUS_LABELS, type ContactMessageStatus } from "@/lib/contact-messages";

export function ContactMessageStatusControl({ id, status }: { id: string; status: ContactMessageStatus }) {
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
        value={value}
        disabled={isPending}
        onChange={(event) => {
          const next = event.target.value as ContactMessageStatus;
          const previous = value;
          setValue(next);
          startTransition(async () => {
            const result = await updateContactMessageStatus(id, next);
            if (result.success) {
              toast.success(`Marked as ${CONTACT_MESSAGE_STATUS_LABELS[next].toLowerCase()}.`);
            } else {
              setValue(previous);
              toast.error(result.error ?? "Could not update the message.");
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
