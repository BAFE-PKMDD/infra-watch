/**
 * API request/response type definitions
 */

// Generic API response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ABEMIS API types
export interface AbemisGeoTag {
  id: string;
  project_id: string;
  photo_name: string;
  url: string;
  category?: string;
}

export interface AbemisProposalDocument {
  id: string;
  project_id: string;
  file_name: string;
  category: string;
  url: string;
}

export interface AbemisPowRelation {
  id: string;
  project_index: string;
  total_quantity: string;
  contract_cost: string;
  date: string;
  target: string;
  actual: string;
  attachment_url: string | null;
}

export interface AbemisProcurementRelation {
  id: string;
  project_id: string;
  milestone: string | null;
  target_date: string | null;
  actual_date: string | null;
  factors_affecting_progress: string | null;
  measures_undertaken: string | null;
  remarks: string | null;
}

export interface AbemisPsgc {
  psgc_code: string;
  region: string;
  province: string;
  district: string;
  municipality: string;
  barangay: string;
}

export interface AbemisKmlLink {
  id: string;
  project_id: string;
  file_name: string;
  url: string;
  status: string;
  remarks: string;
}

export interface AbemisProject {
  id: string;
  project_id: string;
  project_title: string;
  description: string;
  operating_unit: string;
  banner_program: string;
  year_funded: string;
  project_type: string;
  region: string;
  province: string;
  district: string;
  municipality: string;
  barangay: string;
  stage: string;
  status: string;
  author: string;
  quantity: string;
  quantity_unit: string;
  latitude: string;
  longitude: string;
  allocated_amount: string;
  abc: string | null; // Approved Budget for Contract
  calendar_days: string | null; // Contract duration in calendar days
  beneficiary: string;
  prexc_program: string;
  sub_program: string;
  indicator_level1: string;
  indicator_level3: string;
  recipient_type: string;
  budget_process: string | null;
  date_completed: string | null;
  date_turn_over: string | null;
  road_class: string | null;
  road_type: string | null;
  road_used: string | null;
  contractor: string | null;
  implementation_type: string | null;
  proposed_length: string | null;
  post_geotagged_length: string | null;
  procurement_mode: string | null;
  geotag: AbemisGeoTag[];
  proposalDocuments: AbemisProposalDocument[];
  powRelation: AbemisPowRelation[];
  procurementRelation: AbemisProcurementRelation[];
  kmllink: AbemisKmlLink | null;
  psgc: AbemisPsgc;
  sourceId: number;
}

export interface AbemisFilter {
  year_funded: string | null;
  project_types: string[];
}

export interface AbemisPagination {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
}

export interface AbemisListResponse {
  success: boolean;
  filter: AbemisFilter;
  pagination: AbemisPagination;
  count: number;
  data: AbemisProject[];
}

export interface AbemisSyncResponse {
  success: boolean;
  projectsAdded: number;
  projectsUpdated: number;
  projectsFailed: number;
  errors?: string[];
}

// MinIO upload types
export interface MinioUploadResponse {
  url: string;
  key: string;
  bucket: string;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  fileUrl: string;
  expiresIn: number;
}

// Project API types
export interface ProjectsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  region?: string;
  province?: string;
  city?: string;
  barangay?: string;
  stage?: string;
}

/**
 * API response for project list endpoint
 * Note: Different from ProjectsResponse in project.types.ts which uses Project[] type
 */
export interface ProjectsApiResponse {
  success: boolean;
  data: any[]; // ProjectDisplayItem[]
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Location API types
export interface LocationsResponse {
  success: boolean;
  regions: string[];
  provinces: string[];
  municipalities: string[];
  barangays: string[];
}

export interface LocationsQueryParams {
  region?: string;
  province?: string;
  city?: string;
}

// ABEMIS Client types
export interface FetchProjectsParams {
  page?: number;
  pageSize?: number;
  yearFunded?: string;
  projectTypes?: string[];
  /** Bypass Next.js Data Cache — always fetch fresh data from ABEMIS */
  noCache?: boolean;
}

// MIADP API types
export interface MiadpGeotag {
  id: string;
  externalId?: string | null;
  url: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  category?: string | null;
}

export interface MiadpDocument {
  id: string;
  name: string;
  attachment: string;
}

export interface MiadpPowDetail {
  id: string;
  name: string;
  attachment: string;
  date?: string | null;
  target?: string | null;
  actual?: string | null;
}

export interface MiadpProcurementDetail {
  id: string;
  name: string;
  url: string;
}

export interface MiadpMetadata {
  id: string;
  kml?: string | null;
  subprojectId: string;
  geotags: MiadpGeotag[];
  documents: MiadpDocument[];
  powDetails: MiadpPowDetail[];
  procurementDetails: MiadpProcurementDetail[];
}

export interface MiadpProject {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: string;
  stage: string;
  ancestralDomain: string;
  cadtNumber: string;
  region: string;
  province: string;
  municipality: string;
  barangay: string;
  psgcCode: string;
  latitude: string;
  longitude: string;
  proposedLength: string | null;
  actualLength: string | null;
  designLength: string | null;
  unitOfMeasure: string;
  roadClass: string;
  roadType: string;
  sourceOfFund: string;
  yearFunded: number;
  totalBudget: number | null;
  approvedBudget: number | null;
  operatingUnit: string;
  contractor: string | null;
  duration: number | null;
  startDate: string | null;
  endDate: string | null;
  targetCompletionDate: string | null;
  commodities: string[];
  createdAt: string;
  updatedAt: string;
  metadata: MiadpMetadata;
}

export interface MiadpListResponse {
  success: boolean;
  count: number;
  timestamp: string;
  data: MiadpProject[];
}
