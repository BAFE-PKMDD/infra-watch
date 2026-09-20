import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { isLiveVideoUploadPath } from "@/lib/live-video-upload";
import { downloadFile } from "@/lib/minio";
import { isFeedbackUploadPath } from "@/lib/minio-url";

export const runtime = "nodejs";

const MEDIA_CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const path = request.nextUrl.searchParams.get("path") ?? "";
  if (!isLiveVideoUploadPath(path) && !isFeedbackUploadPath(path)) {
    return NextResponse.json({ error: "Invalid upload preview path." }, { status: 400 });
  }

  try {
    const media = await downloadFile(path);
    const extension = path.split(".").pop()?.toLowerCase() ?? "";

    return new NextResponse(new Uint8Array(media), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": "inline",
        "Content-Type": MEDIA_CONTENT_TYPES[extension] ?? "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Upload preview failed", error);
    return NextResponse.json({ error: "Media preview is unavailable." }, { status: 404 });
  }
}
