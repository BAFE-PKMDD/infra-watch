import type { GeoTag } from "@/types/photo.types";
import { isPhilippineCoordinatePair } from "@/lib/philippine-coordinates";

export type CoordinatePair = [number, number];

export function parseProjectCoordinates(value?: string): CoordinatePair | null {
  if (!value) return null;
  const parts = value.split(",").map((part) => part.trim());
  if (parts.length !== 2 || parts.some((part) => part === "")) return null;
  const [latitude, longitude] = parts.map(Number);
  return isPhilippineCoordinatePair(latitude, longitude) ? [latitude, longitude] : null;
}

export function getMappableProjectPhotos(photos: GeoTag[]) {
  return photos.flatMap((tag, index) => {
    const position = parseProjectCoordinates(`${tag.latitude ?? ""},${tag.longitude ?? ""}`);
    return position ? [{ tag, index, position }] : [];
  });
}

export type MappableProjectPhoto = ReturnType<typeof getMappableProjectPhotos>[number];
