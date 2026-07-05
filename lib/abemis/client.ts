import type { AbemisListResponse, AbemisProject, FetchProjectsParams } from "@/types/api.types";

const ABEMIS_BASE_URL = process.env.ABEMIS_BASE_URL;
const ABEMIS_API_KEY = process.env.ABEMIS_API_KEY;
const INFRA_ENDPOINT = process.env.ABEMIS_INFRA_ENDPOINT ?? "/api/infra-amefip-list";

export class AbemisApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown,
  ) {
    super(message);
    this.name = "AbemisApiError";
  }
}

function buildUrl(path: string) {
  if (!ABEMIS_BASE_URL) {
    throw new AbemisApiError("ABEMIS_BASE_URL is not configured");
  }

  return new URL(path, ABEMIS_BASE_URL);
}

function resolveTotalPages(response: AbemisListResponse) {
  return Math.max(1, Number(response.pagination?.total_pages ?? 1));
}

export async function fetchInfraProjects(params: FetchProjectsParams = {}): Promise<AbemisListResponse> {
  const { page = 1, pageSize = 100, yearFunded, noCache } = params;
  const url = buildUrl(INFRA_ENDPOINT);

  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(pageSize));

  if (yearFunded) {
    url.searchParams.set("year_funded", yearFunded);
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (ABEMIS_API_KEY) {
    headers["x-api-key"] = ABEMIS_API_KEY;
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
    cache: noCache ? "no-store" : "force-cache",
    next: noCache ? undefined : { revalidate: process.env.NODE_ENV === "production" ? 3600 : 300 },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new AbemisApiError(`ABEMIS API request failed: ${response.statusText}`, response.status, body);
  }

  const data = (await response.json()) as AbemisListResponse;

  if (!data.success) {
    throw new AbemisApiError("ABEMIS API returned success: false", undefined, data);
  }

  return data;
}

export async function fetchAllInfraProjects(onProgress?: (current: number, total: number) => void) {
  const allProjects: AbemisProject[] = [];
  const firstPage = await fetchInfraProjects({ page: 1, pageSize: 100, noCache: true });

  allProjects.push(...firstPage.data);

  const totalPages = resolveTotalPages(firstPage);
  onProgress?.(1, totalPages);

  const batchSize = 5;
  for (let start = 2; start <= totalPages; start += batchSize) {
    const requests = [];

    for (let page = start; page < start + batchSize && page <= totalPages; page += 1) {
      requests.push(fetchInfraProjects({ page, pageSize: 100, noCache: true }));
    }

    const responses = await Promise.all(requests);
    for (const response of responses) {
      allProjects.push(...response.data);
    }

    onProgress?.(Math.min(start + batchSize - 1, totalPages), totalPages);
  }

  return allProjects;
}
