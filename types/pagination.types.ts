/**
 * Pagination-related type definitions
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
  maxLimit?: number;
}

export interface ValidatedPagination {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Alternative pagination response format (used in some queries)
 * Includes pageSize instead of limit, and totalCount instead of total
 */
export interface AlternativePaginationResponse {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
