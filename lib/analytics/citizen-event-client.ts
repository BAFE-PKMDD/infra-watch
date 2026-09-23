type ProjectViewEventInput = {
  eventName: "project_viewed";
  routeTemplate: "/projects/[id]";
  resourceId: string;
  entrySurface: "directory" | "search" | "map" | "landing" | "direct";
};

type SearchProjectOpenEventInput = {
  eventName: "project_opened_from_search";
  routeTemplate: "/projects";
  resourceId: string;
  entrySurface: "search";
};

type MapProjectOpenEventInput = {
  eventName: "map_project_opened";
  routeTemplate: "/projects" | "/map";
  resourceId: string;
  entrySurface: "map";
};

type SearchEventInput = {
  eventName: "project_search_completed";
  routeTemplate: "/projects";
  entrySurface: "directory";
  resultCount: number;
};

type MapViewEventInput = {
  eventName: "map_viewed";
  routeTemplate: "/projects" | "/projects/[id]" | "/map";
  entrySurface: "map";
};

export type CitizenEngagementEventInput =
  | ProjectViewEventInput
  | SearchProjectOpenEventInput
  | MapProjectOpenEventInput
  | SearchEventInput
  | MapViewEventInput;

export function inferProjectEntrySurface(returnHref: string | null) {
  if (!returnHref) return "direct" as const;
  if (returnHref === "/map") return "map" as const;
  const query = returnHref.includes("?")
    ? new URLSearchParams(returnHref.slice(returnHref.indexOf("?") + 1))
    : null;
  if (query?.get("view") === "map") return "map" as const;
  if ((query?.get("q")?.trim().length ?? 0) >= 2) return "search" as const;
  return "directory" as const;
}

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export async function sendCitizenEngagementEvent(
  event: CitizenEngagementEventInput,
  fetcher: FetchLike = fetch,
): Promise<boolean> {
  try {
    const response = await fetcher("/api/analytics/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
      credentials: "same-origin",
      keepalive: true,
    });
    return response.ok;
  } catch {
    return false;
  }
}
