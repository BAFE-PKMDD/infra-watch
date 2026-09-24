import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateUniqueFileName, uploadFile } from "@/lib/minio";
import { db } from "@/lib/db";
import { kbDocuments } from "@/lib/db/schema";
import { normalizeKnowledgeBaseCategory } from "@/lib/knowledge-base";

export const runtime = "nodejs";

const ALLOWED_KB_EXTENSIONS = new Set(["pdf", "txt", "md"]);
const ALLOWED_KB_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
]);
const MAX_KB_FILE_SIZE = 20 * 1024 * 1024; // 20MB

function getFileType(fileName: string, mimeType: string): string {
  if (mimeType === "application/pdf") return "PDF";
  if (fileName.endsWith(".md")) return "Markdown";
  return "TXT";
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const role = typeof session.user.role === "string" ? session.user.role : null;
    if (role !== "admin" && role !== "moderator") {
      return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const title = formData.get("title");
    const category = formData.get("category");
    const visibilityInput = formData.get("visibility");

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Document title is required." }, { status: 400 });
    }

    if (!category || typeof category !== "string") {
      return NextResponse.json({ error: "Category is required." }, { status: 400 });
    }

    const visibility = visibilityInput === "admin_only" ? "admin_only" : "public";

    let normalizedCategory: string;
    try {
      normalizedCategory = normalizeKnowledgeBaseCategory(category);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid category." },
        { status: 400 },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_KB_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF, TXT, and MD files are allowed." },
        { status: 400 },
      );
    }

    if (!ALLOWED_KB_MIME_TYPES.has(file.type.toLowerCase()) && file.type !== "application/octet-stream") {
      return NextResponse.json(
        { error: "Invalid MIME type for knowledge base document." },
        { status: 400 },
      );
    }

    if (file.size > MAX_KB_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_KB_FILE_SIZE / 1024 / 1024}MB limit.` },
        { status: 400 },
      );
    }

    // Upload to MinIO
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = generateUniqueFileName(file.name, "knowledge-base");
    const filePath = await uploadFile(fileName, buffer, file.type, file.size);

    // Create document record
    const [doc] = await db
      .insert(kbDocuments)
      .values({
        title: title.trim(),
        category: normalizedCategory,
        fileType: getFileType(file.name, file.type),
        fileName: file.name,
        filePath,
        fileSize: file.size,
        status: "pending",
        visibility,
        contentPreview: `Reference document "${title.trim()}" queued for processing.`,
        uploadedBy: session.user.id,
        uploadedByName: session.user.name ?? "Unknown",
      })
      .returning();

    return NextResponse.json({
      success: true,
      document: {
        id: doc.id,
        title: doc.title,
        status: doc.status,
        visibility: doc.visibility,
      },
    });
  } catch (error) {
    console.error("[KB Upload] Error:", error);
    return NextResponse.json(
      { error: "Knowledge-base upload failed." },
      { status: 500 },
    );
  }
}
