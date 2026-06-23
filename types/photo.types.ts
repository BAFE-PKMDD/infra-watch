/**
 * Photo-related type definitions
 */

export type PhotoStatus = "pending" | "approved" | "rejected";
export type PhotoCategory = "before" | "during" | "after";

export interface Photo {
  id: string;
  projectId: string;
  userId: string;

  // Photo details
  caption?: string | null;
  category?: PhotoCategory | null;
  status: PhotoStatus;

  // MinIO storage
  minioUrl: string;
  thumbnailUrl?: string | null;

  // EXIF data
  latitude: number;
  longitude: number;
  takenAt?: Date | null;

  // Validation
  isValidLocation: boolean;
  distanceFromProject?: number | null; // in meters

  // Moderation
  moderatedBy?: string | null;
  moderatedAt?: Date | null;
  moderationNotes?: string | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface PhotoWithUser extends Photo {
  user: {
    id: string;
    name: string;
    image?: string | null;
  };
}

export interface PhotoUploadData {
  projectId: string;
  caption?: string;
  category?: PhotoCategory;
  file: File;
  latitude: number;
  longitude: number;
  takenAt?: Date;
}

export interface PhotoModerationAction {
  photoId: string;
  action: "approve" | "reject";
  notes?: string;
}

/**
 * GeoTag category for photo classification
 */
export type GeoTagCategory =
  | "Validation Photos"
  | "Progress Photos"
  | "Completed Photos"
  | "Uncategorized Photos";

/**
 * GeoTag interface for project photo geolocation data
 * Used for EXIF extraction and photo mapping
 */
export interface GeoTag {
  id?: string;
  project_id?: string;
  photo_name?: string;
  url?: string;
  latitude?: string;
  longitude?: string;
  timestamp?: string;
  category?: GeoTagCategory;
  [key: string]: any;
}

export interface ExtractedGeoTag extends GeoTag {
  latitude: string;
  longitude: string;
  exifExtracted?: boolean;
}
