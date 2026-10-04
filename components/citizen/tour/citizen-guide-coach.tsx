"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { citizenGuideSteps, citizenStepCanAdvance, citizenStepToRevisit, CITIZEN_GUIDES, type CitizenStep } from "@/lib/tours/citizen";
import { guideControl, performGuideControlAction } from "@/lib/tours/guide-control";
import { guidePopups } from "@/lib/tours/guide-popups";
import { tourPanelPosition, tourRectUnion, type TourRect } from "@/lib/tours/position";
import { trackTourLayout } from "@/lib/tours/track-layout";
import type { TourOutcome } from "@/lib/tours/progress";
import type { CitizenGuideSession } from "./citizen-guide-context";
import { CitizenGuideSpotlight } from "./citizen-guide-spotlight";
import styles from "@/components/admin/tour/live-tutorial.module.css";

function visible(selector: string): HTMLElement | null {
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).find((element) => element.getClientRects().length > 0 && !element.closest('[data-state="closed"], [data-closed]') && getComputedStyle(element).visibility !== "hidden") ?? null;
}

function stepTarget(step: CitizenStep): HTMLElement | null {
  return visible(step.target) ?? (step.fallbackTarget ? visible(step.fallbackTarget) : null);
}

function stepActionTarget(step: CitizenStep): HTMLElement | null {
  return step.actionTarget ? visible(step.actionTarget) : stepTarget(step);
}

function stepReadiness(step: CitizenStep, element = stepTarget(step)) {
  const value = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement ? element.value.trim() : "";
  const remaining = Math.max(0, (step.minLength ?? 0) - value.length);
  return { remaining, ready: Boolean(element) && remaining === 0 && (!step.readyTarget || Boolean(visible(step.readyTarget))) };
}

export default function CitizenGuideCoach({ session, onClose }: { session: CitizenGuideSession; onClose: (outcome: TourOutcome) => void }) {
  const pathname = usePathname();
  const steps = useMemo(() => citizenGuideSteps(session.guide), [session.guide]);
  const [index, setIndex] = useState(0);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [view, setView] = useState<{ rect: TourRect | null; actionRect: TourRect | null; left: number; top: number; ready: boolean; remaining: number; canAct: boolean; menu: boolean }>({ rect: null, actionRect: null, left: 16, top: 16, ready: false, remaining: 0, canAct: false, menu: false });
  const target = useRef<HTMLElement | null>(null);
  const panel = useRef<HTMLElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const lastScrolled = useRef<HTMLElement | null>(null);
  const clickedStep = useRef<number | null>(null);
  const current = steps[index];
  const title = CITIZEN_GUIDES.find(({ id }) => id === session.guide)!.title;
  const finish = () => onClose(current.advance === "done" && view.ready ? "completed" : "skipped");

  useLayoutEffect(() => {
    const element = layer.current;
    element?.showPopover?.();
    return () => { if (element?.isConnected && element.matches(":popover-open")) element.hidePopover(); };
  }, [host]);

  useEffect(() => {
    const measure = () => {
      const revisit = citizenStepToRevisit(steps, index, (selector) => Boolean(visible(selector)));
      if (revisit !== index) { setIndex(revisit); return; }
      const next = steps[index + 1];
      if (citizenStepCanAdvance(current, clickedStep.current === index, Boolean(next && visible(next.allow ?? next.target)))) {
        setIndex(index + 1);
        return;
      }
      const element = stepTarget(current);
      // Follow the actual form's Back and Edit controls.
      if (!element && current.allow?.startsWith('[data-citizen-step=')) {
        const previous = steps.findIndex((item, position) => position < index && item.allow?.startsWith('[data-citizen-step=') && visible(item.allow));
        if (previous >= 0) { setIndex(previous); return; }
      }
      target.current = element;
      const modal = element?.closest<HTMLElement>('[role="dialog"], [role="alertdialog"], [role="menu"]') ?? visible('[role="dialog"][aria-modal="true"]');
      setHost(modal ?? document.body);
      if (element && element !== lastScrolled.current) {
        element.scrollIntoView({ behavior: "instant", block: "center" });
        lastScrolled.current = element;
      }
      const viewport = window.visualViewport;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      const x = viewport?.offsetLeft ?? 0;
      const y = viewport?.offsetTop ?? 0;
      const rectFor = (node: HTMLElement | null): TourRect | null => {
        if (!node) return null;
        const bounds = node.getBoundingClientRect();
        const clip = node.closest('[role="dialog"], [role="alertdialog"]')?.getBoundingClientRect();
        const left = Math.max(4, (clip?.left ?? x) - x, bounds.left - x - 5);
        const top = Math.max(4, (clip?.top ?? y) - y, bounds.top - y - 5);
        const right = Math.min(width - 4, (clip?.right ?? x + width) - x, bounds.right - x + 5);
        const bottom = Math.min(height - 4, (clip?.bottom ?? y + height) - y, bounds.bottom - y + 5);
        return right > left && bottom > top ? { left, top, width: right - left, height: bottom - top } : null;
      };
      const popups = guidePopups(current.allow ? visible(current.allow) : element);
      const rect = tourRectUnion([rectFor(element?.closest("label") ?? element), ...popups.map(rectFor)]);
      const actionElement = stepActionTarget(current);
      // The dropdown can cover the form's Next button. Do not outline a control underneath it.
      const actionRect = current.actionTarget && !popups.length ? rectFor(actionElement) : null;
      const size = panel.current?.getBoundingClientRect();
      const position = tourPanelPosition(rect, { width, height }, { width: size?.width ?? 360, height: size?.height ?? 250 });
      const { ready, remaining } = stepReadiness(current, element);
      const updated = {
        rect: rect ? { ...rect, left: rect.left + x, top: rect.top + y } : null,
        actionRect: actionRect ? { ...actionRect, left: actionRect.left + x, top: actionRect.top + y } : null,
        left: position.left + x, top: position.top + y,
        ready,
        remaining,
        canAct: !popups.length && Boolean(current.action && guideControl(actionElement, current.action)) && (current.action?.behavior !== "activate" || ready),
        menu: Boolean(element && current.fallbackTarget && !visible(current.target)),
      };
      setView((previous) => JSON.stringify(previous) === JSON.stringify(updated) ? previous : updated);
    };
    const stopTracking = trackTourLayout(measure);
    const protect = (event: Event) => {
      if (!(event.target instanceof Element)) return;
      const allowed = current.allow ? visible(current.allow) : stepTarget(current);
      const eventTarget = event.target;
      const popup = guidePopups(allowed).some((element) => element.contains(eventTarget));
      const formSubmit = event.type === "submit" && allowed && event.target.contains(allowed);
      if (!layer.current?.contains(event.target) && !allowed?.contains(event.target) && !popup && !formSubmit) {
        event.preventDefault(); event.stopPropagation();
        return;
      }
      if (event.type === "click" && current.requireClick && visible(current.target)?.contains(event.target)) {
        clickedStep.current = index;
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Let the field close its dropdown before Escape ends the guide.
      if (guidePopups(current.allow ? visible(current.allow) : stepTarget(current)).length) return;
      event.preventDefault(); event.stopPropagation();
      onClose(current.advance === "done" && target.current ? "completed" : "skipped");
    };
    document.addEventListener("keydown", escape, true);
    document.addEventListener("click", protect, true);
    document.addEventListener("submit", protect, true);
    return () => {
      stopTracking();
      document.removeEventListener("click", protect, true); document.removeEventListener("submit", protect, true);
      document.removeEventListener("keydown", escape, true);
    };
  }, [current, host, index, onClose, pathname, steps]);

  if (!host) return null;
  return createPortal(<div ref={layer} popover="manual" data-live-tutorial className={styles.layer}>
    <CitizenGuideSpotlight rects={[view.rect, view.actionRect].filter((rect): rect is TourRect => Boolean(rect))} />
    <section ref={panel} role="region" aria-label={`${title} guide`} className={styles.panel} style={{ left: view.left, top: view.top }} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); finish(); } }}>
      <header className="flex items-center justify-between gap-2 border-b border-border pl-4 pr-1">
        <p className="text-xs font-semibold">{title} · {index + 1} of {steps.length}</p>
        <button type="button" className={styles.iconButton} aria-label="End guide" onClick={finish}><X aria-hidden="true" className="size-4" /></button>
      </header>
      <div aria-live="polite" aria-atomic="true" className="px-4 py-3">
        <p className="mb-2 text-xs font-semibold text-primary">Guide mode · No real submissions</p>
        <h2 className="font-heading text-lg font-semibold">{current.title}</h2>
        <p className="mt-1 text-sm leading-6">{current.description}</p>
        {view.menu ? <p className="mt-2 text-sm">Open the navigation menu to find this link.</p> : null}
        {!view.rect ? <p className="mt-2 text-sm">Waiting for the page control. If you left the page or closed its form, end this guide and open it again.</p> : null}
      </div>
      {current.minLength && view.rect && view.remaining > 0 ? <p role="status" className="px-4 pb-3 text-sm font-medium">Enter {view.remaining} more {view.remaining === 1 ? "character" : "characters"} to continue.</p> : null}
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2">
        {index > 0 && steps[index - 1].advance === "next" ? <button type="button" className={styles.button} onClick={() => setIndex(index - 1)}>Back</button> : null}
        {current.action ? <button type="button" className={`${styles.button} ${current.action.behavior === "activate" ? styles.primary : ""}`} disabled={!view.canAct} onClick={() => {
          // Re-resolve after navigation so a stale target can never be activated.
          const revisit = citizenStepToRevisit(steps, index, (selector) => Boolean(visible(selector)));
          if (revisit !== index) { setIndex(revisit); return; }
          if (guidePopups(current.allow ? visible(current.allow) : stepTarget(current)).length) return;
          if (current.action?.behavior === "activate" && !stepReadiness(current).ready) return;
          const element = stepActionTarget(current);
          performGuideControlAction(element, current.action!);
        }}>{view.menu ? "Open menu" : current.action.label}</button> : null}
        {current.advance === "next" ? <button type="button" className={`${styles.button} ${styles.primary}`} disabled={!view.ready} onClick={() => {
          const revisit = citizenStepToRevisit(steps, index, (selector) => Boolean(visible(selector)));
          if (revisit !== index) { setIndex(revisit); return; }
          if (stepReadiness(current).ready) setIndex(index + 1);
        }}>Next</button> : null}
        {current.advance === "done" ? <button type="button" className={`${styles.button} ${styles.primary}`} disabled={!view.ready} onClick={finish}>Done</button> : null}
      </footer>
    </section>
  </div>, host);
}
