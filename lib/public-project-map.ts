import { mapInternalToPublicStage } from "@/constants/stage-mapping";
import { isPhilippineCoordinatePair } from "@/lib/philippine-coordinates";

export const PROJECT_MARKER_LEGEND = [
  { label: "Completed", color: "#22c55e" },
  { label: "On going", color: "#eab308" },
  { label: "Not yet started", color: "#ef4444" },
  { label: "Other / unknown", color: "#64748b" },
] as const;

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
      desc: [row.barangay, row.municipality].filter(Boolean).join(", ") || "Location unavailable",
      progress: row.physicalProgress,
    }];
  });
}
