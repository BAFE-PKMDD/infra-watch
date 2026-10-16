"use client";
import { Button } from "@/components/ui/button";
import { contentButtonClass } from "./content-controls";
export function ContentRouteError({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">This page could not be loaded</h1>
      <p className="text-sm text-slate-700 dark:text-slate-300">
        Check your connection and try again. You may also need to sign in with
        an authorized account.
      </p>
      <Button className={contentButtonClass} onClick={reset}>
        Retry
      </Button>
    </div>
  );
}
