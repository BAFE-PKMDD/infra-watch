import {
  normalizeCitizenEngagementEvent,
  shouldExcludeAnalyticsRole,
  type NormalizedCitizenEngagementEvent,
} from "./citizen-event-policy";

export type CitizenEventRecordResult = "recorded" | "excluded" | "invalid" | "unavailable";

type PersistedCitizenEngagementEvent = NormalizedCitizenEngagementEvent & {
  networkRegionCode?: string;
};

type RecordCitizenEngagementEventOptions = {
  input: unknown;
  role?: string | null;
  resolveNetworkRegion?: () => Promise<{ code: string; label: string } | null>;
  isKnownProject?: (projectId: string) => Promise<boolean>;
  insertEvent: (event: PersistedCitizenEngagementEvent) => Promise<void>;
  reportError?: (error: unknown) => void;
};

export async function recordCitizenEngagementEvent({
  input,
  role,
  resolveNetworkRegion,
  isKnownProject,
  insertEvent,
  reportError = () => undefined,
}: RecordCitizenEngagementEventOptions): Promise<CitizenEventRecordResult> {
  if (role === undefined || shouldExcludeAnalyticsRole(role)) return "excluded";

  let event: NormalizedCitizenEngagementEvent;
  try {
    event = normalizeCitizenEngagementEvent(input);
  } catch {
    return "invalid";
  }

  try {
    if (event.resourceType === "project") {
      if (!isKnownProject || !await isKnownProject(event.resourceId!)) return "invalid";
    }
    let networkRegionCode: string | null = null;
    try {
      networkRegionCode = (await resolveNetworkRegion?.())?.code ?? null;
    } catch {
      networkRegionCode = null;
    }
    await insertEvent(networkRegionCode?.match(/^PH\d{9}$/)
      ? { ...event, networkRegionCode }
      : event);
    return "recorded";
  } catch (error) {
    reportError(error);
    return "unavailable";
  }
}
