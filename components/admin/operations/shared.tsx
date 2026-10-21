"use client";
import type { ReactNode } from "react";
export const operationControl =
  "min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60";
export const operationDate = (value: string | Date) =>
  new Date(value).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  });
export async function operationRequest<T>(
  url: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    cache: "no-store",
    ...(body !== undefined
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "The request could not be completed");
  return result as T;
}
export function OperationError({ error }: { error: unknown }) {
  return error ? (
    <p
      role="alert"
      className="text-sm leading-6 text-red-700 dark:text-red-300"
    >
      {error instanceof Error ? error.message : String(error)}
    </p>
  ) : null;
}
export function OperationTable({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground sm:hidden">
        Scroll horizontally to see all columns.
      </p>
      <div
        tabIndex={0}
        role="region"
        aria-label={label}
        className="overflow-x-auto rounded-md border border-border focus-visible:outline-2 focus-visible:outline-primary"
      >
        <table className="w-full min-w-[680px] text-left text-sm [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3 [&_th]:font-semibold [&_tr]:border-b [&_tr]:border-border">
          {children}
        </table>
      </div>
    </div>
  );
}
