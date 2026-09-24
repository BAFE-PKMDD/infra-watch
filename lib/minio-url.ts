/**
 * Client-safe MinIO URL utilities
 * These functions can be used in both server and client components
 */

// MinIO configuration (read from env or use defaults)
const getMinioConfig = () => {
  const endpoint = process.env.NEXT_PUBLIC_MINIO_ENDPOINT ? process.env.NEXT_PUBLIC_MINIO_ENDPOINT : 'storage.bafe.gov.ph';
  const useSSL = process.env.NEXT_PUBLIC_MINIO_USE_SSL === 'true' ? true : false;
  const bucket = process.env.NEXT_PUBLIC_MINIO_BUCKET || process.env.MINIO_BUCKET_NAME || 'infra-watch';

  return { endpoint, useSSL, bucket };
};

const FEEDBACK_UPLOAD_PATH_RE = /^feedback\/\d+-[a-f0-9]{32}\.(?:jpe?g|png|webp|gif|mp4|mov|webm)$/;
const PRIVATE_STORAGE_PATH_RE = /^(?:knowledge-base|issue-evidence)\//;

export function isFeedbackUploadPath(filePath: string): boolean {
  return FEEDBACK_UPLOAD_PATH_RE.test(filePath);
}

export function isPrivateStoragePath(filePath: string): boolean {
  return PRIVATE_STORAGE_PATH_RE.test(filePath);
}

function isLocalMinioEndpoint(endpoint: string): boolean {
  const host = endpoint.toLowerCase().split(":")[0];
  return host === "localhost" || host === "127.0.0.1";
}

/**
 * Build full URL from file path
 * @param filePath - The file path (e.g., "articles/123.jpg")
 * @returns The full URL to access the file
 */
export function getFileUrl(filePath: string): string {
  const { endpoint, useSSL, bucket } = getMinioConfig();

  if (isPrivateStoragePath(filePath) || (isLocalMinioEndpoint(endpoint) && isFeedbackUploadPath(filePath))) {
    return `/api/upload/preview?path=${encodeURIComponent(filePath)}`;
  }

  const protocol = useSSL ? 'https' : 'http';
  return `${protocol}://${endpoint}/${bucket}/${filePath}`;
}

/**
 * Check if a string is a full URL or just a path
 * @param urlOrPath - The string to check
 * @returns true if it's a full URL, false if it's just a path
 */
export function isFullUrl(urlOrPath: string): boolean {
  return urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://') || urlOrPath.startsWith('/');
}

function getLegacyPrivateStoragePath(urlOrPath: string): string | null {
  if (!isFullUrl(urlOrPath)) return null;

  try {
    const { endpoint } = getMinioConfig();
    const configuredOrigin = new URL(
      endpoint.startsWith("http://") || endpoint.startsWith("https://")
        ? endpoint
        : `http://${endpoint}`,
    );
    const url = new URL(urlOrPath);
    if (url.host.toLowerCase() !== configuredOrigin.host.toLowerCase()) {
      return null;
    }

    const segments = decodeURIComponent(url.pathname).split("/").filter(Boolean);
    const privatePrefixIndex = segments.findIndex(
      (segment) => segment === "knowledge-base" || segment === "issue-evidence",
    );
    if (privatePrefixIndex < 1) return null;

    const storagePath = segments.slice(privatePrefixIndex).join("/");
    return isPrivateStoragePath(storagePath) ? storagePath : null;
  } catch {
    return null;
  }
}

/**
 * Get full URL from either a path or existing full URL
 * Handles backward compatibility with old records that have full URLs
 * @param urlOrPath - Either a full URL or just the file path
 * @returns The full URL
 */
export function getFullUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  const legacyPrivatePath = getLegacyPrivateStoragePath(urlOrPath);
  if (legacyPrivatePath) return getFileUrl(legacyPrivatePath);
  return isFullUrl(urlOrPath) ? urlOrPath : getFileUrl(urlOrPath);
}

/**
 * Check if a URL points to a local MinIO instance
 * Used to determine if images should be unoptimized in local development
 */
export function isLocalMinIO(url: string | null | undefined): boolean {
  if (!url) return false;
  return (
    url.includes('localhost:9000') ||
    url.includes('127.0.0.1:9000') ||
    url.startsWith('/api/upload/preview')
  );
}
