"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { inferProjectEntrySurface, sendCitizenEngagementEvent } from "@/lib/analytics/citizen-event-client";

export function ProjectViewTracker({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams();
  const tracked = useRef(false);
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    void sendCitizenEngagementEvent({
      eventName: "project_viewed",
      routeTemplate: "/projects/[id]",
      resourceId: projectId,
      entrySurface: inferProjectEntrySurface(searchParams.get("return")),
    });
  }, [projectId, searchParams]);
  return null;
}
