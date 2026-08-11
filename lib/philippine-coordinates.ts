export const PHILIPPINE_COORDINATE_BOUNDS = {
  minLatitude: 4.5,
  maxLatitude: 21.5,
  minLongitude: 116,
  maxLongitude: 127,
} as const;

export function isPhilippineCoordinatePair(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
) {
  return typeof latitude === "number"
    && Number.isFinite(latitude)
    && typeof longitude === "number"
    && Number.isFinite(longitude)
    && latitude >= PHILIPPINE_COORDINATE_BOUNDS.minLatitude
    && latitude <= PHILIPPINE_COORDINATE_BOUNDS.maxLatitude
    && longitude >= PHILIPPINE_COORDINATE_BOUNDS.minLongitude
    && longitude <= PHILIPPINE_COORDINATE_BOUNDS.maxLongitude;
}
