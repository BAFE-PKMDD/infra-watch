/**
 * Client-safe MinIO URL utilities
 * These functions can be used in both server and client components
 */

// MinIO configuration (read from env or use defaults)
const getMinioConfig = () => {
  const endpoint = process.env.NEXT_PUBLIC_MINIO_ENDPOINT ? process.env.NEXT_PUBLIC_MINIO_ENDPOINT : 'storage.bafe.online';
  const useSSL = process.env.NEXT_PUBLIC_MINIO_USE_SSL === 'true' ? true : false;
  const bucket = process.env.NEXT_PUBLIC_MINIO_BUCKET || process.env.MINIO_BUCKET_NAME || 'infra-watch';

  return { endpoint, useSSL, bucket };
};

/**
 * Build full URL from file path
 * @param filePath - The file path (e.g., "articles/123.jpg")
 * @returns The full URL to access the file
 */
export function getFileUrl(filePath: string): string {
  const { endpoint, useSSL, bucket } = getMinioConfig();
  const protocol = useSSL ? 'https' : 'http';
  return `${protocol}://${endpoint}/${bucket}/${filePath}`;
}

/**
 * Check if a string is a full URL or just a path
 * @param urlOrPath - The string to check
 * @returns true if it's a full URL, false if it's just a path
 */
export function isFullUrl(urlOrPath: string): boolean {
  return urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://');
}

/**
 * Get full URL from either a path or existing full URL
 * Handles backward compatibility with old records that have full URLs
 * @param urlOrPath - Either a full URL or just the file path
 * @returns The full URL
 */
export function getFullUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  return isFullUrl(urlOrPath) ? urlOrPath : getFileUrl(urlOrPath);
}

/**
 * Check if a URL points to a local MinIO instance
 * Used to determine if images should be unoptimized in local development
 */
export function isLocalMinIO(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('localhost:9000') || url.includes('127.0.0.1:9000');
}
