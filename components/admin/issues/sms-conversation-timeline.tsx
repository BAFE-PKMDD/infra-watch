import type { SmsConversationItem } from "@/types/sms-grievance.types";

function historyLabel(kind: SmsConversationItem["kind"]) {
  return {
    inbound_sms: "Incoming SMS",
    outbound_sms: "Sample reply",
    internal_note: "Internal note",
    status_event: "Case status",
  }[kind];
}

export function SmsConversationTimeline({ conversation }: { conversation: SmsConversationItem[] }) {
  return (
    <details className="border-t border-slate-200 pt-5 dark:border-slate-800">
      <summary className="min-h-11 cursor-pointer py-2 font-heading text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        Message and case history
      </summary>
      <ol className="mt-3 space-y-3">
        {conversation.map((item) => (
          <li key={item.id} className="border-l-2 border-slate-300 pl-4 dark:border-slate-700">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{historyLabel(item.kind)}</p>
            <p className="mt-1 break-words text-sm leading-6 text-slate-700 dark:text-slate-300">{item.body}</p>
          </li>
        ))}
      </ol>
    </details>
  );
}
