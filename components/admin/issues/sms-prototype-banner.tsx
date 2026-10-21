import { AlertTriangle } from "lucide-react";

export function SmsPrototypeBanner() {
  return (
    <section aria-labelledby="prototype-title" className="border border-orange-200 bg-orange-50 px-4 py-4 text-orange-950 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-100">
      <div className="flex gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-orange-700 dark:text-orange-300" />
        <div>
          <h2 id="prototype-title" className="font-heading text-base font-semibold">SMS Grievance prototype</h2>
          <p className="mt-1 text-sm leading-6">No SMS service is connected. Every message, contact, status, and action on this page is a sample.</p>
        </div>
      </div>
    </section>
  );
}

export function SmsFeedUnavailableNotice() {
  return (
    <section role="alert" aria-labelledby="sms-feed-unavailable-title" className="border border-red-200 bg-red-50 px-4 py-4 text-red-950 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100">
      <div className="flex gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-red-700 dark:text-red-300" />
        <div>
          <h2 id="sms-feed-unavailable-title" className="font-heading text-base font-semibold">SMS grievance feed unavailable</h2>
          <p className="mt-1 text-sm leading-6">The live SMS grievance line could not be read, so no messages are shown. This is not an empty inbox. The page checks again automatically; reload to retry now.</p>
        </div>
      </div>
    </section>
  );
}
