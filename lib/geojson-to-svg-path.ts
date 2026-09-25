export type Position = [number, number];
export type PolygonCoordinates = Position[][];
export type MultiPolygonCoordinates = Position[][][];

export interface GeoFeature {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry:
    | { type: "Polygon"; coordinates: PolygonCoordinates }
    | { type: "MultiPolygon"; coordinates: MultiPolygonCoordinates };
}

export interface GeoFeatureCollection {
  type: "FeatureCollection";
  features: GeoFeature[];
}

export type Projector = (position: Position) => [number, number];

function forEachPosition(geometry: GeoFeature["geometry"], visit: (position: Position) => void) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const position of ring) visit(position);
    }
  }
}

/**
 * A simple equirectangular (linear lat/lon) projection, fit to a viewport with
 * uniform scale and centered padding. Adequate for a small, near-equatorial
 * country shown decoratively - not meant for navigational accuracy.
 */
export function createEquirectangularProjector(
  featureCollection: GeoFeatureCollection,
  viewportWidth: number,
  viewportHeight: number,
  padding = 8,
): Projector {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const feature of featureCollection.features) {
    forEachPosition(feature.geometry, ([lon, lat]) => {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });
  }

  const lonSpan = maxLon - minLon || 1;
  const latSpan = maxLat - minLat || 1;
  const availableWidth = viewportWidth - padding * 2;
  const availableHeight = viewportHeight - padding * 2;
  const scale = Math.min(availableWidth / lonSpan, availableHeight / latSpan);
  const projectedWidth = lonSpan * scale;
  const projectedHeight = latSpan * scale;
  const offsetX = padding + (availableWidth - projectedWidth) / 2;
  const offsetY = padding + (availableHeight - projectedHeight) / 2;

  return ([lon, lat]) => [
    offsetX + (lon - minLon) * scale,
    // SVG y grows downward; latitude grows northward, so flip it.
    offsetY + (maxLat - lat) * scale,
  ];
}

export function geometryToSvgPath(geometry: GeoFeature["geometry"], project: Projector): string {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons
    .map((polygon) =>
      polygon
        .map((ring) => {
          const commands = ring.map((position, index) => {
            const [x, y] = project(position);
            return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
          });
          return `${commands.join(" ")} Z`;
        })
        .join(" "),
    )
    .join(" ");
}
