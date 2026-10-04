"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import { getTourProgress, saveTourProgress } from "@/actions/tours";
import { CITIZEN_GUIDES, CITIZEN_OVERVIEW_ID, citizenGuideAllowsPath, citizenOverview, type CitizenGuideId } from "@/lib/tours/citizen";
import { applyTourUpdate, EMPTY_TOUR_PROGRESS, tourKey, type TourOutcome, type TourProgress } from "@/lib/tours/progress";
import { CitizenGuideContext, type CitizenGuideSession } from "./citizen-guide-context";
import type { Tour } from "@/lib/tours/catalog";

const TourDialog = dynamic(() => import("@/components/admin/tour/tour-dialog"), { ssr: false });
const CitizenGuideCoach = dynamic(() => import("./citizen-guide-coach"), { ssr: false });

function visibleOverview(): Tour {
  return { ...citizenOverview, steps: citizenOverview.steps.map((step) => {
    const visible = step.target && Array.from(document.querySelectorAll<HTMLElement>(step.target)).some((element) => element.getClientRects().length > 0);
    return visible ? step : { ...step, target: '[data-citizen-nav="header"]' };
  }) };
}

export function CitizenTourProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.role === "citizen" ? user.id ?? null : null;
  // Keep the same component tree during hydration, before the session resolves.
  return <CitizenTours key={userId ?? "inactive"} userId={userId}>{children}</CitizenTours>;
}

function CitizenTours({ userId, children }: { userId: string | null; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const cache = useQueryClient();
  const queryKey = ["citizen-tour-progress", userId];
  const { data: progress, isPending } = useQuery({ queryKey, queryFn: getTourProgress, enabled: Boolean(userId), staleTime: Infinity, retry: false });
  const [session, setSession] = useState<CitizenGuideSession | null>(null);
  const [overview, setOverview] = useState<{ path: string; tour: Tour } | null>(null);
  const attempted = useRef(false);
  const queue = useRef(Promise.resolve());
  const visibleSession = session && (pathname === session.returnTo || citizenGuideAllowsPath(session.guide, pathname)) ? session : null;
  const active = Boolean(session || overview?.path === pathname);

  useEffect(() => {
    if (!userId || !progress || active || attempted.current || !progress.automatic || progress.seen[tourKey(CITIZEN_OVERVIEW_ID)]) return;
    const timer = window.setInterval(() => {
      // Language selection, sign-in, and an in-progress form take priority.
      if (!document.querySelector('[data-tour="citizen-guides"]') || document.querySelector('[role="dialog"], dialog[open]') || document.activeElement?.matches("input, textarea, select")) return;
      attempted.current = true;
      setOverview({ path: pathname, tour: visibleOverview() });
      clearInterval(timer);
    }, 900);
    return () => clearInterval(timer);
  }, [active, pathname, progress, userId]);

  const record = (tourId: string, outcome: TourOutcome, disableAutomatic = !(progress?.automatic ?? true)) => {
    const update = { tourId, outcome, disableAutomatic };
    cache.setQueryData<TourProgress>(queryKey, (current) => applyTourUpdate(current ?? EMPTY_TOUR_PROGRESS, update));
    queue.current = queue.current.then(() => saveTourProgress(update)).catch(() => {
      toast.error("Your guide preference could not be saved. You can still use the guides.");
    });
  };

  const close = (outcome: TourOutcome) => {
    if (!session) return;
    record(session.guide, outcome);
    setSession(null);
    router.replace(session.returnTo);
    requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-tour="citizen-guides"] summary')?.focus());
  };

  const start = (id: CitizenGuideId) => {
    const guide = CITIZEN_GUIDES.find((item) => item.id === id);
    if (!guide || active) return;
    attempted.current = true;
    setSession({ id: crypto.randomUUID(), guide: id, returnTo: pathname, submitted: false });
    // Submission guides begin at the actual navigation, not inside the form.
    if (id === "citizen-sms") router.push(guide.path);
  };

  return <CitizenGuideContext.Provider value={userId ? {
    session: visibleSession, progress, loading: isPending, active, start,
    overview: () => { attempted.current = true; setOverview({ path: pathname, tour: visibleOverview() }); },
    submitted: (kind) => setSession((current) => current?.guide === kind ? { ...current, submitted: true } : current),
  } : null}>
    {children}
    {session ? <CitizenGuideCoach key={session.id} session={session} onClose={close} /> : null}
    {overview?.path === pathname ? <TourDialog tour={overview.tour} automatic={progress?.automatic ?? true} onClose={(outcome, disabled) => {
      record(CITIZEN_OVERVIEW_ID, outcome, disabled);
      setOverview(null);
    }} /> : null}
  </CitizenGuideContext.Provider>;
}
