import { z } from "zod";

export const CITIZEN_ENGAGEMENT_EVENT_NAMES = [
  "site_visit",
  "project_search_completed",
  "project_viewed",
  "project_opened_from_search",
  "map_viewed",
  "map_project_opened",
] as const;

export type CitizenEngagementEventName = (typeof CITIZEN_ENGAGEMENT_EVENT_NAMES)[number];
export type CitizenEngagementEntrySurface = "directory" | "search" | "map" | "landing" | "direct";
export type SearchResultCountBand = "0" | "1_10" | "11_50" | "51_plus";

export type CitizenEngagementRouteTemplate = "/" | "/projects" | "/projects/[id]" | "/map" | "other";

export type NormalizedCitizenEngagementEvent = {
  eventName: CitizenEngagementEventName;
  routeTemplate: CitizenEngagementRouteTemplate;
  resourceType: "project" | null;
  resourceId: string | null;
  entrySurface: CitizenEngagementEntrySurface;
  resultCountBand: SearchResultCountBand | null;
  /**
   * Random per-browser-session token, only ever present on `site_visit` events. It lets the
   * dashboard count distinct visits. It is not derived from the IP address or device, is not
   * persisted across sessions, and cannot identify a person.
   */
  visitKey?: string;
};

const VISIT_KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const inputSchema = z.object({
  eventName: z.enum(CITIZEN_ENGAGEMENT_EVENT_NAMES),
  routeTemplate: z.enum(["/", "/projects", "/projects/[id]", "/map", "other"]),
  resourceType: z.literal("project").optional(),
  resourceId: z.string().trim().min(1).max(160).optional(),
  entrySurface: z.enum(["directory", "search", "map", "landing", "direct"]),
  resultCount: z.number().int().min(0).max(1_000_000).optional(),
  visitKey: z.string().regex(VISIT_KEY_PATTERN).optional(),
}).strict();

const projectEvents = new Set<CitizenEngagementEventName>([
  "project_viewed",
  "project_opened_from_search",
  "map_project_opened",
]);

function contractError(path: string, message: string): never {
  throw new z.ZodError([{ code: "custom", path: [path], message }]);
}

export function toResultCountBand(count: number): SearchResultCountBand {
  if (count === 0) return "0";
  if (count <= 10) return "1_10";
  if (count <= 50) return "11_50";
  return "51_plus";
}

export function normalizeCitizenEngagementEvent(input: unknown): NormalizedCitizenEngagementEvent {
  const parsed = inputSchema.parse(input);
  const needsProject = projectEvents.has(parsed.eventName);
  const isSiteVisit = parsed.eventName === "site_visit";

  if (isSiteVisit) {
    if (!parsed.visitKey) {
      throw new z.ZodError([{ code: "custom", path: ["visitKey"], message: "visitKey is required for site visits" }]);
    }
    if (parsed.entrySurface !== "landing") {
      contractError("entrySurface", "site visits require the landing surface");
    }
    if (parsed.resourceId || parsed.resourceType) {
      contractError("resourceId", "resource fields are only valid for project engagement events");
    }
    if (parsed.resultCount !== undefined) {
      contractError("resultCount", "resultCount is only valid for completed project searches");
    }
    return {
      eventName: "site_visit",
      routeTemplate: parsed.routeTemplate,
      resourceType: null,
      resourceId: null,
      entrySurface: "landing",
      resultCountBand: null,
      visitKey: parsed.visitKey.toLowerCase(),
    };
  }

  if (parsed.visitKey) {
    contractError("visitKey", "visitKey is only valid for site visits");
  }
  if (parsed.routeTemplate === "/" || parsed.routeTemplate === "other") {
    contractError("routeTemplate", "only site visits may use the generic route templates");
  }

  if (needsProject && !parsed.resourceId) {
    throw new z.ZodError([{
      code: "custom",
      path: ["resourceId"],
      message: "resourceId is required for project engagement events",
    }]);
  }
  if (!needsProject && (parsed.resourceId || parsed.resourceType)) {
    contractError("resourceId", "resource fields are only valid for project engagement events");
  }
  if (parsed.eventName === "project_search_completed"
    && (parsed.routeTemplate !== "/projects" || parsed.entrySurface !== "directory")) {
    contractError("routeTemplate", "completed searches require the directory route and surface");
  }
  if (parsed.eventName === "project_opened_from_search"
    && (parsed.routeTemplate !== "/projects" || parsed.entrySurface !== "search")) {
    contractError("entrySurface", "search project opens require the directory route and search surface");
  }
  if (parsed.eventName === "map_project_opened"
    && ((parsed.routeTemplate !== "/projects" && parsed.routeTemplate !== "/map") || parsed.entrySurface !== "map")) {
    contractError("entrySurface", "map project opens require a public map route and map surface");
  }
  if (parsed.eventName === "project_viewed" && parsed.routeTemplate !== "/projects/[id]") {
    contractError("routeTemplate", "project views require the project detail route");
  }
  if (parsed.eventName === "map_viewed" && parsed.entrySurface !== "map") {
    contractError("entrySurface", "map views require the map surface");
  }
  if (parsed.eventName === "project_search_completed" && parsed.resultCount === undefined) {
    throw new z.ZodError([{
      code: "custom",
      path: ["resultCount"],
      message: "resultCount is required for completed project searches",
    }]);
  }
  if (parsed.eventName !== "project_search_completed" && parsed.resultCount !== undefined) {
    throw new z.ZodError([{
      code: "custom",
      path: ["resultCount"],
      message: "resultCount is only valid for completed project searches",
    }]);
  }

  return {
    eventName: parsed.eventName,
    routeTemplate: parsed.routeTemplate,
    resourceType: needsProject ? "project" : null,
    resourceId: needsProject ? parsed.resourceId! : null,
    entrySurface: parsed.entrySurface,
    resultCountBand: parsed.resultCount === undefined ? null : toResultCountBand(parsed.resultCount),
  };
}

export function shouldExcludeAnalyticsRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "regional_admin" || role === "moderator";
}
