/**
 * Project-related type definitions
 */

export interface Project {
  id: string;
  sourceProjectId: string;
  sourceId?: string | null;
  sourceAgency: string;
  name: string;
  description?: string | null;
  status: string;

  // Location
  province?: string | null;
  region?: string | null;
  municipality?: string | null;
  barangay?: string | null;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geom?: string | null; // PostGIS geometry (WKT format)
  psgcCode?: string | null;

  // Budget & Timeline
  budget?: number | null;
  abc?: number | null; // Approved Budget for Contract
  calendarDays?: number | null; // Contract duration in calendar days
  contractorName?: string | null;
  startDate?: Date | null;
  targetCompletionDate?: Date | null;
  actualCompletionDate?: Date | null;

  // Project Details
  stage?: string | null;
  operatingUnit?: string | null;
  yearFunded?: string | null;
  projectType?: string | null;

  // Project Specifications
  quantity?: string | null;
  quantityUnit?: string | null;
  proposedLength?: string | null;
  postGeotaggedLength?: string | null;
  procurementMode?: string | null;

  // Commodities
  commodities?: string[] | null;

  // Metadata
  metadata?: Record<string, unknown> | null;

  // Agency-specific data (internal/admin)
  sourceData?: Record<string, unknown> | null;

  // Public-facing agency data (key-value pairs)
  agencyData?: Record<string, string | number | boolean | null> | null;

  // Timestamps
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectWithStats extends Project {
  photoCount: number;
  feedbackCount: number;
  averageRating?: number;
}

export interface ProjectListItem {
  id: string;
  name: string;
  status: string;
  location: string; // Combined location string
  budget?: number | null;
  photoCount: number;
  feedbackCount: number;
}

export interface ProjectFilters {
  status?: string[];
  stage?: string;
  region?: string;
  province?: string;
  municipality?: string;
  barangay?: string;
  budgetMin?: number;
  budgetMax?: number;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ProjectSort {
  field: "name" | "status" | "budget" | "startDate" | "createdAt";
  direction: "asc" | "desc";
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface ProjectsResponse {
  success: boolean;
  projects: Project[];
  pagination: PaginationInfo;
}

export interface ProjectsStagesResponse {
  success: boolean;
  stages: string[];
}

export interface ProjectsRegionsResponse {
  success: boolean;
  regions: string[];
}

/**
 * Project document and relation interfaces
 * Used for project metadata storage
 */

export interface ProposalDocument {
  id?: string;
  project_id?: string;
  file_name?: string;
  url?: string;
  category?: string;
  uploaded_at?: string;
  [key: string]: any;
}

export interface PowRelation {
  id?: string;
  project_index?: string;
  total_quantity?: string;
  contract_cost?: string;
  date?: string;
  target?: string;
  actual?: string;
  attachment_url?: string | null;
  [key: string]: any;
}

export interface ProcurementRelation {
  id?: string;
  project_id?: string;
  milestone?: string;
  target_date?: string | null;
  actual_date?: string | null;
  factors_affecting_progress?: string;
  measures_undertaken?: string;
  remarks?: string;
  [key: string]: any;
}
