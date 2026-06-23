/**
 * Issue reporting type definitions
 */

/**
 * Issue reporting form data
 */
export interface IssueFormData {
  // Project Info (Optional)
  projectId?: string;

  // Location (Required)
  region: string;
  province: string;
  city: string;
  barangay: string;
  streetLandmark: string;

  // Issue Details (Required)
  issueType: string;
  issueDescription: string;
  dateNoticed: string;

  // Evidence (Optional)
  photos: File[];
  videos: File[];
  documents: File[];

  // Reporter Info (Required)
  fullName: string;
  contactNumber: string;
  email: string;
  isAnonymous: boolean;

  // Consent (Required)
  confirmAccuracy: boolean;
  agreeToTerms: boolean;
}

export type IssueType =
  | "damage"
  | "stopped"
  | "safety"
  | "flooding"
  | "blocked"
  | "quality"
  | "other";


export type IssueStatus = "pending" | "reviewing" | "resolved" | "closed";

/**
 * Issue record (stored in database)
 */
export interface Issue {
  id: string;
  projectId?: string | null;

  // Location
  region: string;
  province: string;
  city: string;
  barangay: string;
  streetLandmark: string;
  coordinates?: { lat: number; lng: number } | null;

  // Issue Details
  issueType: IssueType;
  issueDescription: string;
  dateNoticed: Date;
  status: IssueStatus;

  // Evidence
  photoUrls: string[];
  videoUrls: string[];
  documentUrls: string[];

  // Reporter Info
  reporterId?: string | null; // User ID if logged in
  reporterName: string;
  reporterContact: string;
  reporterEmail?: string | null;
  isAnonymous: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date | null;
}
