import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { isLiveVideoUploadPath } from "@/lib/live-video-upload";
import { downloadFile } from "@/lib/minio";

export const runtime = "nodejs";

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const path = request.nextUrl.searchParams.get("path") ?? "";
  if (!isLiveVideoUploadPath(path)) {
    return NextResponse.json({ error: "Invalid live-video preview path." }, { status: 400 });
  }

  try {
    const image = await downloadFile(path);
    const extension = path.split(".").pop()?.toLowerCase() ?? "";

    return new NextResponse(new Uint8Array(image), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": "inline",
        "Content-Type": IMAGE_CONTENT_TYPES[extension] ?? "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Live-video preview failed", error);
    return NextResponse.json({ error: "Thumbnail preview is unavailable." }, { status: 404 });
  }
}
