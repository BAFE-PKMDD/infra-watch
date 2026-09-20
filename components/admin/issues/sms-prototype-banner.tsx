import { AlertTriangle } from "lucide-react";

export function SmsPrototypeBanner() {
  return (
    <section aria-labelledby="prototype-title" className="border-l-4 border-orange-600 bg-orange-50 px-4 py-4 text-orange-950 dark:bg-orange-950/30 dark:text-orange-100">
      <div className="flex gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <div>
          <h2 id="prototype-title" className="font-heading text-base font-bold">SMS Grievance prototype</h2>
          <p className="mt-1 text-sm leading-6">No SMS service is connected. Every message, contact, status, and action on this page is a sample.</p>
        </div>
      </div>
    </section>
  );
}
