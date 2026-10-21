import { MAX_DIRECT_UPLOAD_SIZE } from "@/lib/operations-models";

async function uploadRequest<T>(
  url: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    ...(body
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Video upload failed");
  return data as T;
}

export async function uploadLargeVideo(
  file: File,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
) {
  if (file.size > MAX_DIRECT_UPLOAD_SIZE)
    throw new Error("Recordings may be up to 20 GB");
  const session = await uploadRequest<{
    id: string;
    multipart: boolean;
    partSize?: number;
    url?: string;
  }>("/api/upload/multipart", "POST", {
    name: file.name,
    size: file.size,
    type: file.type,
  });
  const parts: { partNumber: number; etag: string }[] = [];
  const count = session.multipart
    ? Math.ceil(file.size / session.partSize!)
    : 1;
  try {
    for (let index = 0; index < count; index++) {
      if (signal?.aborted) throw new Error("Upload cancelled");
      const start = session.multipart ? index * session.partSize! : 0;
      const chunk = file.slice(
        start,
        session.multipart
          ? Math.min(file.size, start + session.partSize!)
          : file.size,
        file.type,
      );
      let etag = "";
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const url = session.multipart
            ? (
                await uploadRequest<{ url: string }>(
                  `/api/upload/multipart?id=${session.id}&part=${index + 1}`,
                )
              ).url
            : session.url!;
          etag = await new Promise<string>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const cancel = () => xhr.abort();
            const cleanup = () => signal?.removeEventListener("abort", cancel);
            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable)
                onProgress(
                  Math.min(
                    99,
                    Math.floor(((start + event.loaded) / file.size) * 100),
                  ),
                );
            };
            xhr.onload = () => {
              cleanup();
              if (xhr.status >= 200 && xhr.status < 300)
                resolve(
                  (xhr.getResponseHeader("ETag") || "").replaceAll('"', ""),
                );
              else reject(new Error("A video part could not be uploaded"));
            };
            xhr.onerror = () => {
              cleanup();
              reject(new Error("Storage connection failed"));
            };
            xhr.onabort = () => {
              cleanup();
              reject(new Error("Upload cancelled"));
            };
            xhr.open("PUT", url);
            xhr.setRequestHeader("Content-Type", file.type);
            signal?.addEventListener("abort", cancel, { once: true });
            if (signal?.aborted) {
              cleanup();
              reject(new Error("Upload cancelled"));
              return;
            }
            xhr.send(chunk);
          });
          break;
        } catch (error) {
          if (attempt === 2 || signal?.aborted) throw error;
        }
      }
      if (session.multipart) parts.push({ partNumber: index + 1, etag });
    }
    if (signal?.aborted) throw new Error("Upload cancelled");
    onProgress(100);
    const result = await uploadRequest<{ path: string }>(
      "/api/upload/multipart",
      "PUT",
      { id: session.id, parts },
    );
    onProgress(100);
    return result.path;
  } catch (error) {
    await uploadRequest("/api/upload/multipart", "DELETE", {
      id: session.id,
    }).catch(() => {});
    throw error;
  }
}
