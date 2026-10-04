"use client";

import { createContext, useContext } from "react";
import type { SandboxAction, TutorialSandbox } from "@/lib/tours/sandbox";

export type TutorialSandboxContextValue = { state: TutorialSandbox; apply: (action: SandboxAction) => void };
export const TutorialSandboxContext = createContext<TutorialSandboxContextValue | null>(null);
export const useTutorialSandbox = () => useContext(TutorialSandboxContext);

export function TutorialModeNotice() {
  return <p role="status" className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-foreground">Tutorial mode · Example data only. Nothing you send, save, or delete here changes real records.</p>;
}
