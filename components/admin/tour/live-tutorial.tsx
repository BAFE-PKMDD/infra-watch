"use client";

import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { TUTORIAL_ACTION_EVENT, type TutorialActionEvent } from "@/lib/tours/events";
import { canAdvanceLiveStep, INITIAL_LIVE_STATE, liveTutorialSteps, reconcileLiveTutorial, reduceLiveTutorial, type LiveTutorialEvent, type LiveTutorialState } from "@/lib/tours/live-tutorial";
import { tourPanelPosition, tourRectUnion, type TourRect } from "@/lib/tours/position";
import { guidePopups } from "@/lib/tours/guide-popups";
import { trackTourLayout } from "@/lib/tours/track-layout";
import type { TourOutcome } from "@/lib/tours/progress";
import { lessonPath, lessonPrefix, type TaskTutorial } from "@/lib/tours/tutorials";
import styles from "./live-tutorial.module.css";

function visible(selector: string, root: ParentNode = document): HTMLElement | null {
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).find((element) =>
    element.getClientRects().length > 0 && !element.closest('[data-state="closed"], [data-closed]') && getComputedStyle(element).visibility !== "hidden",
  ) ?? null;
}

export default function LiveTutorial({ tutorial, automatic, onClose }: {
  tutorial: TaskTutorial; automatic: boolean;
  onClose: (outcome: TourOutcome, disableAutomatic: boolean) => void;
}) {
  const pathname = usePathname();
  const steps = useMemo(() => liveTutorialSteps(tutorial), [tutorial]);
  const [state, dispatch] = useReducer((previous: LiveTutorialState, event: LiveTutorialEvent) => reduceLiveTutorial(previous, event, tutorial), INITIAL_LIVE_STATE);
  const disableAutomatic = !automatic;
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [view, setView] = useState<{ rect: TourRect | null; left: number; top: number; available: boolean; canNext: boolean; waiting: boolean }>({ rect: null, left: 16, top: 16, available: false, canNext: false, waiting: false });
  const layer = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const target = useRef<HTMLElement | null>(null);
  const lastScrolled = useRef<HTMLElement | null>(null);
  const step = steps[state.index];
  const prefix = lessonPrefix(tutorial);
  const moderatingFeedback = tutorial.kind === "approve-feedback" || tutorial.kind === "reject-feedback";
  const rowSelector = `[data-tour="${prefix}-row"]${moderatingFeedback ? '[data-tour-status="pending"]' : ""}`;

  useEffect(() => {
    const receive = (event: Event) => dispatch({ type: "mutation", detail: (event as CustomEvent<TutorialActionEvent>).detail });
    window.addEventListener(TUTORIAL_ACTION_EVENT, receive);
    return () => window.removeEventListener(TUTORIAL_ACTION_EVENT, receive);
  }, []);

  // A manual popover stays above page dialogs without making the actual page inert.
  // Inside a confirmation, its DOM belongs to that dialog's existing focus scope.
  useLayoutEffect(() => {
    const element = layer.current;
    if (!element) return;
    element.showPopover?.();
    return () => { if (element.isConnected && element.matches(":popover-open")) element.hidePopover(); };
  }, [host]);

  useEffect(() => {
    let timedOut = false;
    const measure = () => {
      const row = Array.from(document.querySelectorAll<HTMLElement>(rowSelector)).find((element) =>
        (!state.recordId || element.dataset.tourRecordId === state.recordId) && element.getClientRects().length > 0,
      ) ?? null;
      const detail = visible(`[data-tour="${prefix}-detail"]`);
      const opened = step.opens ? visible(step.opens) : null;
      const container = step.container ? visible(step.container) : null;
      const reviewAction = visible("#review-action");
      const expectedModeration = tutorial.kind === "approve-feedback" ? "approved" : "rejected";
      const matchingAction = (element: HTMLElement | null) => !element?.dataset.tourAction || element.dataset.tourAction === expectedModeration;
      const transition = reconcileLiveTutorial(state, tutorial, {
        rowId: row?.dataset.tourRecordId, issueDetailId: detail?.dataset.tourRecordId,
        onIssueList: pathname === lessonPath(tutorial), openedRecordId: matchingAction(opened) ? opened?.dataset.tourRecordId : null,
        containerRecordId: matchingAction(container) ? container?.dataset.tourRecordId : null,
        reviewMode: reviewAction instanceof HTMLSelectElement ? reviewAction.value : undefined,
      });
      if (transition) { dispatch(transition); return; }

      const root = step.scope === "row" ? row : step.container ? container?.dataset.tourRecordId === state.recordId && matchingAction(container) ? container : null : document;
      const candidate = root ? (step.id === "record" ? row : visible(step.target, root)) : null;
      const fallbackModal = visible('[role="alertdialog"]') ?? visible('[data-tour="feedback-moderation-dialog"]') ?? visible('[role="dialog"][aria-modal="true"]');
      const element = fallbackModal && candidate && !fallbackModal.contains(candidate) ? null : candidate;
      target.current = element;
      const modal = element?.closest<HTMLElement>('[role="dialog"], [role="alertdialog"]');
      // Use any still-open actual modal while waiting for its target to mount.
      setHost(fallbackModal ?? modal ?? document.body);
      if (element && element !== lastScrolled.current) {
        element.scrollIntoView({ behavior: "instant", block: "center", inline: "center" });
        lastScrolled.current = element;
      }
      const viewport = window.visualViewport;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      const offsetTop = viewport?.offsetTop ?? 0;
      const offsetLeft = viewport?.offsetLeft ?? 0;
      // Keep a field's label and helper text visible with the active input.
      const rectFor = (node: HTMLElement | null): TourRect | null => {
        const bounds = node?.getBoundingClientRect();
        return bounds ? {
          left: Math.max(4, bounds.left - offsetLeft - 5), top: Math.max(4, bounds.top - offsetTop - 5),
          width: Math.max(0, Math.min(width - 4, bounds.right - offsetLeft + 5) - Math.max(4, bounds.left - offsetLeft - 5)),
          height: Math.max(0, Math.min(height - 4, bounds.bottom - offsetTop + 5) - Math.max(4, bounds.top - offsetTop - 5)),
        } : null;
      };
      const popups = guidePopups(element);
      const usable = tourRectUnion([rectFor(element?.closest("label") ?? element), ...popups.map(rectFor)]);
      const panelBounds = panel.current?.getBoundingClientRect();
      const position = tourPanelPosition(usable, { width, height }, { width: panelBounds?.width ?? 360, height: panelBounds?.height ?? 250 });
      const value = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement ? element.value : "";
      const next = {
        rect: usable ? { ...usable, left: usable.left + offsetLeft, top: usable.top + offsetTop } : null,
        left: position.left + offsetLeft, top: position.top + offsetTop,
        available: Boolean(element), canNext: !popups.length && canAdvanceLiveStep(step, value, Boolean(element) && !element?.matches(":disabled")), waiting: !element && timedOut,
      };
      setView((previous) => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    const stopTracking = trackTourLayout(measure);
    const onChange = (event: Event) => {
      const control = event.target;
      if (control === target.current && control instanceof HTMLSelectElement && step.value && canAdvanceLiveStep(step, control.value, true)) {
        dispatch({ type: "step", index: state.index + 1 });
      }
    };
    const selectRecord = (event: Event) => {
      if (!(event.target instanceof Element)) return;
      const allowed = target.current?.closest<HTMLElement>('[role="dialog"], [role="alertdialog"], label') ?? target.current;
      const eventTarget = event.target;
      const popup = guidePopups(allowed).some((element) => element.contains(eventTarget));
      const tutorialForm = event.type === "submit" && target.current && event.target.contains(target.current);
      if (!tutorialForm && !layer.current?.contains(event.target) && !allowed?.contains(event.target) && !popup) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (state.pending || state.saved) return;
      const clickedRow = event.target.closest<HTMLElement>(rowSelector);
      if (clickedRow?.dataset.tourRecordId) dispatch({ type: "select", recordId: clickedRow.dataset.tourRecordId });
    };
    document.addEventListener("click", selectRecord, true);
    document.addEventListener("submit", selectRecord, true);
    document.addEventListener("change", onChange);
    const timer = window.setTimeout(() => { timedOut = true; }, 2200);
    return () => {
      stopTracking(); clearTimeout(timer);
      document.removeEventListener("click", selectRecord, true);
      document.removeEventListener("submit", selectRecord, true);
      document.removeEventListener("change", onChange);
    };
  }, [pathname, state, step, tutorial, rowSelector, host, prefix]);

  if (!host) return null;
  const focusTarget = () => {
    const element = target.current;
    if (!element) return;
    const focusable = element.matches("button, a, input, textarea, select, summary") ? element : element.querySelector<HTMLElement>("button, a, input, textarea, select, summary");
    focusable?.focus({ preventScroll: false });
  };
  const finish = (outcome: TourOutcome) => {
    if (layer.current?.contains(document.activeElement)) {
      const cancel = visible(`[data-tour="${prefix}-delete-cancel"]`);
      const fallback = visible('[data-tour-launcher]');
      if (cancel) cancel.focus({ preventScroll: true });
      else if (target.current) focusTarget();
      else (host.querySelector<HTMLElement>('button, input, select, textarea') ?? fallback)?.focus({ preventScroll: true });
    }
    onClose(outcome, disableAutomatic);
  };
  const emptyMessage = state.index <= 1
    ? moderatingFeedback ? "No pending feedback is visible. Change the page filters to find a pending submission, or end the guide." : "Waiting for the example record. You can close this guide and open it again if the page does not load."
    : "This control is not available yet. Wait for the page to load, or return to the report to continue.";
  return createPortal(<div ref={layer} popover="manual" data-live-tutorial className={styles.layer}>
    {view.rect ? <div aria-hidden="true" className={styles.spotlight} style={view.rect} /> : null}
    <section ref={panel} role="region" aria-label={`${tutorial.title} tutorial`} className={styles.panel} style={{ left: view.left, top: view.top }} onKeyDown={(event) => {
      if (event.key === "Escape") { event.stopPropagation(); finish(state.saved ? "completed" : "skipped"); }
    }}>
      <header className="flex items-center justify-between gap-2 border-b border-border pl-4 pr-1">
        <p className="text-xs font-semibold">{tutorial.title} · {state.index + 1} of {steps.length}</p>
        <button type="button" className={styles.iconButton} aria-label="End tutorial" onClick={() => finish(state.saved ? "completed" : "skipped")}><X className="size-4" aria-hidden="true" /></button>
      </header>
      <div className="px-4 py-3" aria-live="polite" aria-atomic="true">
        <p className="mb-2 text-xs font-semibold text-primary">Tutorial mode · No real changes</p>
        <h2 className="font-heading text-lg font-semibold">{step.title}</h2>
        <p className="mt-1 text-sm leading-6">{state.pending ? "Waiting for the result of your action…" : step.description}</p>
        {state.error ? <p className="mt-2 text-sm font-medium text-destructive">The action failed. Review the page error and try again when ready.</p> : null}
        {view.waiting && !state.pending && !state.saved ? <p className="mt-2 text-sm">{emptyMessage}</p> : null}
      </div>
      <footer className="border-t border-border px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-1">
          {state.index > 0 && !state.saved && steps[state.index - 1].advance === "next" ? <button className={styles.button} disabled={state.pending} onClick={() => {
            // Back changes the instruction, never the user's real draft or record.
            const previous = state.index - 1;
            dispatch({ type: "step", index: previous });
          }} type="button">Back</button> : <span />}
          {view.available && !state.pending && step.id !== "record" && step.advance !== "done" ? <button type="button" className={styles.button} onClick={focusTarget}>Go to control</button> : null}
          {step.advance === "next" ? <button type="button" className={`${styles.button} ${styles.primary}`} disabled={!view.canNext || state.pending} onClick={() => dispatch({ type: "step", index: state.index + 1 })}>Next</button>
            : step.advance === "done" ? <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => finish("completed")}>Done</button> : null}
        </div>
        {step.advance === "submit" && !state.pending ? <button type="button" className={`${styles.button} w-full text-left`} onClick={() => finish("skipped")}>Skip this action and end tutorial</button> : null}
        {view.waiting && state.index <= 1 && !state.pending ? <button type="button" className={styles.button} onClick={() => dispatch({ type: "reset" })}>Find a visible record</button> : null}
      </footer>
    </section>
  </div>, host);
}
