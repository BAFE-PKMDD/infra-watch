type UploadResponse = {
  success?: boolean;
  path?: unknown;
  error?: unknown;
};

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

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
