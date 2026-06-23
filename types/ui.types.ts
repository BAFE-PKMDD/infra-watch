import type { LucideIcon } from "lucide-react";
import type { Article } from "./article.types";

export type ViewMode = "table" | "grid" | "maps" | "list";
export type PhotoViewMode = "grid" | "maps";
export type ProjectTabKey = "overview" | "articles" | "updates" | "feedback" | "photos" | "videos" | "documents" | "pow" | "procurement";

export interface LocationFilters {
  region: string;
  province: string;
  city: string;
  barangay: string;
  stage: string;
  year: string;
  agency: string;
}

export interface LocationOption {
  value: string;
  label: string;
}

export interface LocationOptions {
  regions: LocationOption[];
  provinces: LocationOption[];
  cities: LocationOption[];
  barangays: LocationOption[];
  stages: LocationOption[];
  years: LocationOption[];
  agencies: LocationOption[];
}

export interface StatusMeta {
  label: string;
  color: string;
  icon: LucideIcon;
}

export interface ProjectDisplayItem {
  id: string;
  name: string;
  code: string;
  sourceId?: string; // External source system raw ID
  sourceAgency?: string; // "FMRDP", "DPWH", "DILG", etc.
  location: string;
  region?: string;
  province?: string;
  city?: string;
  implementingAgency: string;
  budget: number;
  startDate: string;
  duration: string;
  status: string; // Raw status value from database
  stage?: string; // Project stage
  yearFunded?: number | string;
}

export interface ProjectUpdate {
  date: string;
  title: string;
  description: string;
}

export interface ProjectDetail extends ProjectDisplayItem {
  completionDate: string; // Target completion date
  actualCompletionDate?: string; // Actual completion date
  contractor: string;
  scope: string;
  projectLength: string;
  postGeotaggedLength?: string;
  description: string;
  updates: ProjectUpdate[];
  coordinates?: string;
  abc?: number; // Approved Budget for Contract
  commodities?: string[] | null;
  metadata?: Record<string, any> | null; // Contains geotags, proposalDocuments, powRelation, procurementRelation
  articles?: Article[]; // Related articles and publications
  feedbackCount?: number; // Total approved feedback
  agencyData?: Record<string, string | number | boolean | null> | null; // Public-facing agency-specific data
}
