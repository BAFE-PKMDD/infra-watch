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
