import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { issues } from "@/lib/db/schema";
import { downloadFile } from "@/lib/minio";
import { resolveApprovedPublicImagePath } from "@/lib/public-issue-evidence";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PUBLIC_IMAGE_WIDTH = 1920;

function notFound() {
  return Response.json(
    { error: "Image not found" },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; index: string }> },
) {
  const { id, index } = await params;
  if (!UUID_PATTERN.test(id) || !/^\d{1,3}$/.test(index)) return notFound();

  const [issue] = await db
    .select({
      publicApprovedAt: issues.publicApprovedAt,
      publicDescription: issues.publicDescription,
      evidence: issues.evidence,
    })
    .from(issues)
    .where(eq(issues.id, id))
    .limit(1);

  const path = issue ? resolveApprovedPublicImagePath(issue, Number(index)) : null;
  if (!path) return notFound();

  try {
    const original = await downloadFile(path);
    const sharp = (await import("sharp")).default;
    const { format } = await sharp(original, { failOn: "none" }).metadata();

    // sharp drops EXIF/GPS metadata on re-encode unless withMetadata() is used;
    // rotate() first applies the EXIF orientation so the photo is not turned.
    const pipeline = sharp(original, { failOn: "none" })
      .rotate()
      .resize({ width: MAX_PUBLIC_IMAGE_WIDTH, withoutEnlargement: true });
    const [output, contentType] = format === "jpeg"
      ? [await pipeline.jpeg({ quality: 88 }).toBuffer(), "image/jpeg"]
      : format === "webp"
        ? [await pipeline.webp({ quality: 88 }).toBuffer(), "image/webp"]
        : [await pipeline.png().toBuffer(), "image/png"];

    return new Response(new Uint8Array(output), {
      headers: {
        // Short cache so a withdrawn approval stops being served quickly.
        "Cache-Control": "public, max-age=60",
        "Content-Disposition": "inline",
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Public evidence image failed", error);
    return notFound();
  }
}
