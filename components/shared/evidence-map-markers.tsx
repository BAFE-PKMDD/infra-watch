import L from "leaflet";
import type {} from "leaflet.markercluster";

export type EvidencePinKind = "image" | "video";

export const EVIDENCE_PIN_COLORS: Record<EvidencePinKind, string> = {
  image: "#10b981",
  video: "#0284c7",
};

const PIN_GLYPH: Record<EvidencePinKind, string> = {
  image:
    '<rect x="-6" y="-4.5" width="12" height="9" rx="1.8" fill="#ffffff"/>' +
    '<rect x="2.4" y="-6.2" width="3.4" height="2.1" rx="0.6" fill="#ffffff"/>' +
    '<circle cx="0" cy="0.3" r="2.6" fill="var(--pin-fill)"/>',
  video:
    '<circle cx="0" cy="0" r="6.5" fill="#ffffff"/>' +
    '<path d="M-2.3 -3.8 L4.6 0 L-2.3 3.8 Z" fill="var(--pin-fill)"/>',
};

/**
 * Builds a teardrop pin divIcon. The glyph markup references var(--pin-fill),
 * set inline per-icon so a single glyph string works for both media types.
 */
export function createEvidencePinIcon(kind: EvidencePinKind, selected: boolean) {
  const width = selected ? 34 : 28;
  const height = selected ? 44 : 36;
  const fill = EVIDENCE_PIN_COLORS[kind];
  const strokeColor = selected ? "#0f172a" : "#ffffff";
  const strokeWidth = selected ? 3 : 2;

  const html = `
    <svg width="${width}" height="${height}" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg"
      style="display:block;--pin-fill:${fill};filter:drop-shadow(0 1px 2px rgba(15,23,42,0.35))">
      <path d="M16 1C7.988 1 1.5 7.488 1.5 15.5c0 10.2 13.02 21.86 14.02 22.73a.75.75 0 0 0 .96 0C17.48 37.36 30.5 25.7 30.5 15.5 30.5 7.488 24.012 1 16 1z"
        fill="${fill}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>
      <g transform="translate(16,15)">${PIN_GLYPH[kind]}</g>
    </svg>
  `;

  return L.divIcon({
    html,
    className: "evidence-pin-icon",
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    popupAnchor: [0, -height + 6],
  });
}

export function createEvidenceClusterIcon(cluster: L.MarkerCluster) {
  const count = cluster.getChildCount();
  const size = count >= 50 ? 44 : count >= 10 ? 38 : 32;

  return L.divIcon({
    html: `<div class="evidence-cluster-bubble" style="width:${size}px;height:${size}px;">${count}</div>`,
    className: "evidence-cluster-icon",
    iconSize: L.point(size, size, true),
  });
}
