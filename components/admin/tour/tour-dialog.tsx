"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import type { Tour } from "@/lib/tours/catalog";
import type { TourOutcome } from "@/lib/tours/progress";
import { tourPanelPosition, type TourRect } from "@/lib/tours/position";
import { trackTourLayout } from "@/lib/tours/track-layout";
import styles from "./tour-dialog.module.css";

function visibleTarget(selector?: string): HTMLElement | null {
  if (!selector) return null;
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).find((element) =>
    element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden",
  ) ?? null;
}

export default function TourDialog({ tour, automatic, onClose }: { tour: Tour; automatic: boolean; onClose: (outcome: TourOutcome, disableAutomatic: boolean) => void }) {
  const [index, setIndex] = useState(0);
  const [disableAutomatic, setDisableAutomatic] = useState(!automatic);
  const [geometry, setGeometry] = useState<{ rect: TourRect | null; left: number; top: number } | null>(null);
  const [missing, setMissing] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const scrollContainers = useRef(new Map<HTMLElement, { left: number; top: number }>());
  const step = tour.steps[index];
  const last = index === tour.steps.length - 1;
  const close = () => onClose(last ? "completed" : "skipped", disableAutomatic);

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const originalOverflow = document.body.style.overflow;
    const originalScroll = { left: window.scrollX, top: window.scrollY };
    const containers = scrollContainers.current;
    element?.showModal();
    document.body.style.overflow = "hidden";
    heading.current?.focus({ preventScroll: true });
    return () => {
      element?.close();
      document.body.style.overflow = originalOverflow;
      for (const [container, position] of containers) {
        if (container.isConnected) container.scrollTo({ ...position, behavior: "instant" });
      }
      containers.clear();
      window.scrollTo({ ...originalScroll, behavior: "instant" });
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  useLayoutEffect(() => {
    let scrolledTarget: HTMLElement | null = null;
    let timedOut = false;
    const measure = () => {
      const element = visibleTarget(step.target);
      if (element && scrolledTarget !== element) {
        for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
          if ((parent.scrollWidth > parent.clientWidth || parent.scrollHeight > parent.clientHeight) && !scrollContainers.current.has(parent)) {
            scrollContainers.current.set(parent, { left: parent.scrollLeft, top: parent.scrollTop });
          }
        }
        element.scrollIntoView({ behavior: "instant", block: "center", inline: "center" });
        scrolledTarget = element;
      }
      const bounds = element?.getBoundingClientRect();
      // Clamp the highlight to the viewport, including large tables and panels.
      const rect = bounds ? {
        left: Math.max(4, bounds.left - 5), top: Math.max(4, bounds.top - 5),
        width: Math.max(0, Math.min(window.innerWidth - 4, bounds.right + 5) - Math.max(4, bounds.left - 5)),
        height: Math.max(0, Math.min(window.innerHeight - 4, bounds.bottom + 5) - Math.max(4, bounds.top - 5)),
      } : null;
      const usableRect = rect && rect.width > 0 && rect.height > 0 ? rect : null;
      const panelBounds = panel.current?.getBoundingClientRect();
      const position = tourPanelPosition(usableRect, { width: window.innerWidth, height: window.innerHeight }, {
        width: panelBounds?.width ?? 440, height: panelBounds?.height ?? 380,
      });
      setGeometry((previous) => {
        const next = { rect: usableRect, ...position };
        return JSON.stringify(previous) === JSON.stringify(next) ? previous : next;
      });
      setMissing(Boolean(step.target && !element && timedOut));
    };
    const stopTracking = trackTourLayout(measure);
    const timer = window.setTimeout(() => { timedOut = true; }, 1800);
    heading.current?.focus({ preventScroll: true });
    panel.current?.scrollTo({ top: 0 });
    return () => {
      stopTracking();
      clearTimeout(timer);
    };
  }, [step]);

  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="tour-title" aria-describedby="tour-description"
      onCancel={(event) => { event.preventDefault(); close(); }}
      onKeyDown={(event) => {
        if (event.target instanceof HTMLInputElement) return;
        if (event.key === "ArrowRight" && !last) { event.preventDefault(); setIndex((value) => value + 1); }
        if (event.key === "ArrowLeft" && index > 0) { event.preventDefault(); setIndex((value) => value - 1); }
      }}>
      {geometry?.rect ? <div aria-hidden="true" className={styles.spotlight} style={geometry.rect} /> : <div aria-hidden="true" className={styles.shade} />}
      <div ref={panel} className={styles.panel} style={{ left: geometry?.left ?? 16, top: geometry?.top ?? 16 }}>
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-2">
          <p className="text-xs font-semibold text-muted-foreground">{tour.title}</p>
          <button type="button" onClick={close} aria-label="Close tour" className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"><X className="size-5" aria-hidden="true" /></button>
        </div>
        <div className="px-6 pb-3 pt-5">
          <h2 ref={heading} tabIndex={-1} id="tour-title" className="flex items-center gap-2 font-heading text-2xl font-semibold outline-none">
            {last ? <Check aria-hidden="true" className="size-6 shrink-0 text-primary" /> : null}{step.title}
          </h2>
          <p id="tour-description" className="mt-3 text-sm leading-7">{step.description}</p>
          {missing ? <p className="mt-3 text-xs leading-5 text-muted-foreground">This section is not visible right now. You can continue the guide or replay it when the page is ready.</p> : null}
          <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" checked={disableAutomatic} onChange={(event) => setDisableAutomatic(event.target.checked)} className="size-4 shrink-0 accent-primary" />
            Don&apos;t show tours automatically
          </label>
          <div className={`${styles.progress} mt-3`} aria-hidden="true">
            {tour.steps.map((_, stepIndex) => <span key={stepIndex} data-reached={stepIndex <= index} />)}
          </div>
          <p className="mt-3 text-center text-xs tabular-nums text-muted-foreground" role="status" aria-live="polite">Step {index + 1} of {tour.steps.length}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-4">
          {!last ? <button type="button" onClick={() => onClose("skipped", disableAutomatic)} className="min-h-11 rounded-md px-2 text-sm text-muted-foreground hover:bg-muted">Skip tour</button> : null}
          <div className="ml-auto flex gap-2">
            <button type="button" disabled={index === 0} onClick={() => setIndex((value) => value - 1)} className="min-h-11 rounded-md border border-border px-4 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">Back</button>
            <button type="button" onClick={() => last ? onClose("completed", disableAutomatic) : setIndex((value) => value + 1)} className="min-h-11 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90">{last ? "Done" : index === 0 ? "Start tour" : "Next"}</button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
