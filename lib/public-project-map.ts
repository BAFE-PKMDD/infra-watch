import { mapInternalToPublicStage } from "@/constants/stage-mapping";
import { isPhilippineCoordinatePair } from "@/lib/philippine-coordinates";

// `key` names the display label under t("directory.status.…"); `label` is the English text.
export const PROJECT_MARKER_LEGEND = [
  { key: "completed", label: "Completed", color: "#22c55e" },
  { key: "onGoing", label: "On going", color: "#eab308" },
  { key: "notYetStarted", label: "Not yet started", color: "#ef4444" },
  { key: "unknown", label: "Other / unknown", color: "#64748b" },
] as const;

// Pin description used when a record has no barangay or municipality. Pages compare against
// it to show the translated "Location unavailable" label.
export const MAP_PIN_LOCATION_UNAVAILABLE = "Location unavailable";

export function getProjectMarkerColor(status: string) {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, "");
  if (normalizedStatus === "completed") return PROJECT_MARKER_LEGEND[0].color;
  if (normalizedStatus === "ongoing") return PROJECT_MARKER_LEGEND[1].color;
  if (normalizedStatus === "notyetstarted") return PROJECT_MARKER_LEGEND[2].color;
  return PROJECT_MARKER_LEGEND[3].color;
}

type SourceProjectPin = {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  program: string;
  projectType?: string | null;
  barangay: string | null;
  municipality: string | null;
  physicalProgress: number;
};

export function toSourceBackedMapPins(rows: SourceProjectPin[]) {
  return rows.flatMap((row) => {
    if (!isPhilippineCoordinatePair(row.latitude, row.longitude)) return [];
    const latitude = row.latitude as number;
    const longitude = row.longitude as number;
    return [{
      id: row.id,
      name: row.name,
      lat: latitude,
      lng: longitude,
      status: mapInternalToPublicStage(row.status).toLowerCase().replace(/\s+/g, ""),
      type: row.projectType?.trim() || "Unclassified",
      desc: [row.barangay, row.municipality].filter(Boolean).join(", ") || MAP_PIN_LOCATION_UNAVAILABLE,
      progress: row.physicalProgress,
    }];
  });
}
