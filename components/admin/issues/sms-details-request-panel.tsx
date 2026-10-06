"use client";

import { useState } from "react";
import { MessageCircleQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buildDetailsRequestReply } from "@/lib/sms-grievance/auto-response";
import { isReplyableContact } from "@/lib/sms-grievance/contact";
import type { SmsMockScenario } from "@/types/sms-grievance.types";

// Lets staff text the sender for the few facts that decide whether a message belongs to
// InfraWatch, since other systems send to the same SMS line. Sending doesn't change the
// message's status — it stays in "needs checking" until staff decide.
export function SmsDetailsRequestPanel({
  record,
  onSend,
  disabled = false,
}: {
  record: SmsMockScenario;
  onSend: (body: string) => void | Promise<void>;
  disabled?: boolean;
}) {
  const [body, setBody] = useState(() => buildDetailsRequestReply(record.externalMessageId));
  const [open, setOpen] = useState(false);
  const replyable = isReplyableContact(record.contactNumber);
  const lastAsked = [...record.conversation].reverse().find((item) => item.purpose === "details_request");
  const alreadyAsked = Boolean(lastAsked);

  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <p className="text-sm font-bold">Not sure this is for InfraWatch?</p>
      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
        This SMS line is shared with other systems. Text the sender to ask for the project type, location and concern before you decide.
      </p>

      {alreadyAsked && lastAsked && (
        <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-900 dark:bg-amber-950/30 dark:text-amber-200" role="status">
          Awaiting sender reply — asked on {new Date(lastAsked.occurredAt).toLocaleString()}
          {lastAsked.deliveryStatus === "send_failed" ? " (the SMS failed to send)" : ""}. Their answer arrives as a new message; if it comes from the same number, link it to this one.
        </p>
      )}

      {!replyable ? (
        <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">This message has no mobile number to reply to.</p>
      ) : !open ? (
        <Button type="button" variant="outline" className="mt-3 min-h-11 px-4" disabled={disabled} onClick={() => setOpen(true)}>
          <MessageCircleQuestion aria-hidden="true" className="size-4" /> {alreadyAsked ? "Ask again" : "Ask for details"}
        </Button>
      ) : (
        <div className="mt-3 space-y-3">
          <label className="block text-sm font-semibold" htmlFor="details-request-body">
            Message to {record.contactNumber}
            <textarea
              id="details-request-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="mt-1 min-h-52 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          {alreadyAsked && (
            <p className="text-sm text-slate-600 dark:text-slate-300">This sender was already asked once. Send again only if they haven&apos;t replied.</p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              disabled={disabled || !body.trim()}
              className="min-h-11 px-4"
              onClick={async () => {
                await onSend(body);
                setOpen(false);
              }}
            >
              <MessageCircleQuestion aria-hidden="true" className="size-4" /> {disabled ? "Sending…" : "Send question by SMS"}
            </Button>
            <Button type="button" variant="outline" disabled={disabled} className="min-h-11 px-4" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
