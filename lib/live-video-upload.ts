type UploadResponse = {
  success?: boolean;
  path?: unknown;
  error?: unknown;
};

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

const LIVE_VIDEO_IMAGE_PATH =
  /^live-videos\/\d+-[a-f0-9]{32}\.(?:jpe?g|png|webp)$/i;

export function isLiveVideoUploadPath(path: string) {
  return LIVE_VIDEO_IMAGE_PATH.test(path);
}

export function getLiveVideoUploadPreviewUrl(path: string) {
  return isLiveVideoUploadPath(path)
    ? `/api/upload/preview?path=${encodeURIComponent(path)}`
    : null;
}

export async function uploadLiveVideoAsset(
  file: File,
  fetchFn: FetchLike = fetch,
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetchFn("/api/upload?folder=live-videos", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const result = await response.json().catch(() => ({})) as UploadResponse;
  if (!response.ok || result.success !== true || typeof result.path !== "string" || !result.path) {
    throw new Error(typeof result.error === "string" && result.error
      ? result.error
      : "Failed to upload file");
  }

  return result.path;
}
