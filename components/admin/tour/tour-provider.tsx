"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getTourProgress, saveTourProgress } from "@/actions/tours";
import { pageTour, overviewTour, type Tour, type TourViewer } from "@/lib/tours/catalog";
import { applyTourUpdate, automaticTourId, EMPTY_TOUR_PROGRESS, type TourOutcome, type TourProgress, type TourUpdate } from "@/lib/tours/progress";
import { availableResponseLessons, lessonPath, type TaskTutorial } from "@/lib/tours/tutorials";
import { TourContext } from "./tour-launcher";
import { TutorialSandboxContext } from "./tutorial-sandbox";
import { applySandboxAction, createTutorialSandbox, type TutorialSandbox } from "@/lib/tours/sandbox";
import { hasAssignedModeratorScope } from "@/lib/moderator-scope";

const TourDialog = dynamic(() => import("./tour-dialog"), { ssr: false });
const LiveTutorial = dynamic(() => import("./live-tutorial"), { ssr: false });
type ActiveTutorial = { pathname: string } & (
  | { screen: "live"; tutorial: TaskTutorial; automatic: boolean }
  | { screen: "guide"; tour: Tour }
);

export function TourProvider({ userId, role, region, assignedAgency, children }: TourViewer & { userId: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [active, setActive] = useState<ActiveTutorial | null>(null);
  const [sandbox, setSandbox] = useState<TutorialSandbox | null>(null);
  const attemptedPath = useRef<string | null>(null);
  const saveQueue = useRef(Promise.resolve());
  const queryKey = useMemo(() => ["admin-tour-progress", userId], [userId]);
  const progress = useQuery({ queryKey, queryFn: getTourProgress, staleTime: Infinity, retry: false });
  const current = useMemo(() => pageTour(pathname, { role, region, assignedAgency }), [pathname, role, region, assignedAgency]);
  const visible = active?.screen === "live" || active?.pathname === pathname ? active : null;
  const lessons = availableResponseLessons({ role, region, assignedAgency });
  const homePath = hasAssignedModeratorScope({ role, region, assignedAgency }) ? "/dashboard" : "/admin-projects";

  if (active && active.screen !== "live" && active.pathname !== pathname) setActive(null);

  useEffect(() => {
    if (!progress.isError) return;
    toast.error("Saved tour preferences are unavailable. You can still start a tour using the tour buttons.");
  }, [progress.isError]);

  useEffect(() => {
    if (!progress.data || active || attemptedPath.current === pathname) return;
    const id = automaticTourId(progress.data);
    if (!id) return;
    let timer: number;
    const attempt = () => {
      // Do not interrupt an open form, another dialog, or a streamed page shell.
      const editing = document.activeElement?.matches('input, textarea, select, [contenteditable="true"]');
      if (editing || document.querySelector('dialog[open], [role="dialog"][aria-modal="true"], [role="alertdialog"]') || !document.querySelector('[data-tour="page-heading"]')) {
        timer = window.setTimeout(attempt, 900);
        return;
      }
      attemptedPath.current = pathname;
      setActive({ screen: "guide", tour: overviewTour({ role, region, assignedAgency }), pathname });
    };
    timer = window.setTimeout(attempt, 900);
    return () => clearTimeout(timer);
  }, [progress.data, current, pathname, active, role, region, assignedAgency]);

  const start = (allFeatures: boolean) => {
    attemptedPath.current = pathname;
    setSandbox(null);
    setActive({ screen: "guide", tour: !allFeatures && current ? current : overviewTour({ role, region, assignedAgency }), pathname });
  };

  const startLesson = (lesson: TaskTutorial) => {
    if (active || !lessons.some((item) => item.id === lesson.id)) return;
    attemptedPath.current = pathname;
    setSandbox(createTutorialSandbox(crypto.randomUUID(), lesson.kind));
    setActive({ screen: "live", tutorial: lesson, automatic: progress.data?.automatic ?? true, pathname });
    const destination = lessonPath(lesson);
    if (pathname !== destination) router.push(destination);
  };

  const persist = (update: TourUpdate) => {
    saveQueue.current = saveQueue.current.then(() => saveTourProgress(update)).catch(() => {
      toast.error("Tutorial progress could not be saved. The guide may appear again next time you sign in.");
    });
  };

  const recordProgress = (tourId: string, outcome: TourOutcome, disableAutomatic: boolean) => {
    const update = { tourId, outcome, disableAutomatic };
    void queryClient.cancelQueries({ queryKey });
    queryClient.setQueryData<TourProgress>(queryKey, (previous) => applyTourUpdate(previous ?? EMPTY_TOUR_PROGRESS, update));
    persist(update);
  };

  const close = (outcome: TourOutcome, disableAutomatic: boolean) => {
    if (!visible) return;
    const id = visible.screen === "live" ? visible.tutorial.id : visible.tour.id;
    recordProgress(id, outcome, disableAutomatic);
    attemptedPath.current = pathname;
    setSandbox(null);
    if (visible.screen === "live") router.replace(visible.pathname);
    setActive(null);
  };

  return <TourContext.Provider value={{ start, hasPageTour: Boolean(current), learning: { lessons, progress: progress.data, loading: progress.isPending, active: Boolean(active), homePath, startLesson } }}>
    <TutorialSandboxContext.Provider value={sandbox ? { state: sandbox, apply: (action) => {
      const next = applySandboxAction(sandbox, action);
      setSandbox((currentSandbox) => currentSandbox?.id === sandbox.id ? next : currentSandbox);
    } } : null}>
    {children}
    </TutorialSandboxContext.Provider>
    {visible?.screen === "live" ? <LiveTutorial key={`${visible.tutorial.id}:${sandbox?.id}`} tutorial={visible.tutorial} automatic={visible.automatic} onClose={close} /> : null}
    {visible?.screen === "guide" ? <TourDialog key={`${pathname}:${visible.tour.id}`} tour={visible.tour} automatic={progress.data?.automatic ?? true} onClose={close} /> : null}
  </TourContext.Provider>;
}
