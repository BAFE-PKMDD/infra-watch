export type SettingsMessageValue = { text: string; tone: "success" | "error" } | null;

/** Result banner shown above a settings form after saving. */
export function SettingsMessage({ message }: { message: SettingsMessageValue }) {
  if (!message) return null;

  return (
    <div
      role={message.tone === "error" ? "alert" : "status"}
      className={
        message.tone === "success"
          ? "rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
          : "rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
      }
    >
      {message.text}
    </div>
  );
}

/** Shown to staff who can open Settings but are not allowed to change them. */
export function ReadOnlyNotice() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
      Only administrators can change these settings. You can view them here.
    </div>
  );
}
