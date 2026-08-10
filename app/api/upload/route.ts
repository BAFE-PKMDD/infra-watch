import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logBlockedUploadAttempt } from "@/lib/audit";
import { generateUniqueFileName, uploadFile } from "@/lib/minio";
import { assertSafeImageUpload } from "@/lib/services/content-moderation";
import { getClientUploadErrorMessage } from "@/lib/upload-errors";
import { isAllowedFolder, validateUploadFile } from "@/lib/upload-validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required. Please log in to upload files." },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get("folder") || "uploads";

    if (!(file instanceof File)) {
      await logBlockedUploadAttempt({
        actor: session.user,
        request,
        folder,
        reason: "No file provided",
        category: "invalid_request",
      });
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!isAllowedFolder(folder)) {
      await logBlockedUploadAttempt({
        actor: session.user,
        request,
        file,
        folder,
        reason: "Invalid upload folder",
        category: "invalid_request",
      });
      return NextResponse.json({ error: "Invalid upload folder" }, { status: 400 });
    }

    const validated = await validateUploadFile(file).catch(async (error) => {
      const message = error instanceof Error ? error.message : "Invalid upload file";
      await logBlockedUploadAttempt({
        actor: session.user,
        request,
        file,
        folder,
        reason: message,
        category: getUploadAuditCategory(message),
      });
      throw error;
    });
    const buffer = Buffer.from(await file.arrayBuffer());

    if (validated.kind === "image") {
      await assertSafeImageUpload(buffer).catch(async (error) => {
        const message = error instanceof Error ? error.message : "Image failed content moderation";
        await logBlockedUploadAttempt({
          actor: session.user,
          request,
          file,
          folder,
          reason: message,
          category: "nsfw_content",
        });
        throw error;
      });
    }

    const fileName = generateUniqueFileName(`upload.${validated.safeExtension}`, folder);
    const path = await uploadFile(fileName, buffer, validated.contentType, file.size);

    return NextResponse.json({
      success: true,
      path,
      size: file.size,
      type: validated.contentType,
      kind: validated.kind,
    });
  } catch (error) {
    console.error("Upload error", error);
    const message = error instanceof Error ? error.message : "Failed to upload file";
    const clientMessage = getClientUploadErrorMessage(message);

    return NextResponse.json(
      {
        error: clientMessage ?? message,
      },
      { status: clientMessage ? 400 : 500 },
    );
  }
}

function getUploadAuditCategory(message: string) {
  if (message.includes("Invalid file extension")) return "invalid_extension";
  if (message.includes("File content does not match")) return "invalid_signature";
  if (message.includes("size exceeds")) return "size_limit";
  return "invalid_mime";
}
