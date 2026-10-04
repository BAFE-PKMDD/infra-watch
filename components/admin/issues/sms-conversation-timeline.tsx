import type { SmsConversationItem } from "@/types/sms-grievance.types";

function historyLabel(kind: SmsConversationItem["kind"]) {
  return {
    inbound_sms: "Incoming SMS",
    outbound_sms: "Reply sent",
    internal_note: "Internal note",
    status_event: "Case status",
  }[kind];
}

// Outbound replies are simulated everywhere except a staff-simulated test message's
// acknowledgment, which actually goes out over the real gateway (see
// lib/sms-grievance/simulate-incoming.ts) — a short tag tells staff plainly which one
// they're looking at instead of leaving it to the body text alone.
function deliveryAnnotation(item: SmsConversationItem) {
  if (item.kind !== "outbound_sms") return null;
  switch (item.deliveryStatus) {
    case "sent": return "real";
    case "send_failed": return "failed";
    case "simulated_pending": return "pending";
    case "simulated_failed": return "simulated";
    case "simulated_delivered": return "simulated";
    default: return null;
  }
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
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              {historyLabel(item.kind)}
              {deliveryAnnotation(item) && <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">({deliveryAnnotation(item)})</span>}
            </p>
            <p className="mt-1 break-words text-sm leading-6 text-slate-700 dark:text-slate-300">{item.body}</p>
          </li>
        ))}
      </ol>
    </details>
  );
}
