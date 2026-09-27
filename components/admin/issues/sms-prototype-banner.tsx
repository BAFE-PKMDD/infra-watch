import { AlertTriangle } from "lucide-react";

function bannerCopy(dataSource: "live" | "sample", liveFetchError: boolean) {
  if (dataSource === "live") {
    return "Showing live messages from the SMS grievance line. Message text and sender numbers below are real. Accepting, assigning, replying, or changing status here does not send anything or create a real case yet — those actions stay local to this page.";
  }
  if (liveFetchError) {
    return "The live SMS grievance feed could not be reached, so sample messages are shown instead. Every message, contact, status, and action below is a sample, not real data.";
  }
  return "No SMS service is connected. Every message, contact, status, and action on this page is a sample.";
}

export function SmsPrototypeBanner({
  dataSource = "sample",
  liveFetchError = false,
}: {
  dataSource?: "live" | "sample";
  liveFetchError?: boolean;
} = {}) {
  return (
    <section aria-labelledby="prototype-title" className="border border-orange-200 bg-orange-50 px-4 py-4 text-orange-950 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-100">
      <div className="flex gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-orange-700 dark:text-orange-300" />
        <div>
          <h2 id="prototype-title" className="font-heading text-base font-semibold">{dataSource === "live" ? "SMS Grievance review is still a prototype" : "SMS Grievance prototype"}</h2>
          <p className="mt-1 text-sm leading-6">{bannerCopy(dataSource, liveFetchError)}</p>
        </div>
      </div>
    </section>
  );
}
