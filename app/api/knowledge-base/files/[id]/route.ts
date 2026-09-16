import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { kbDocuments } from "@/lib/db/schema";
import { buildInlineFileHeaders } from "@/lib/knowledge-base";
import { downloadFile } from "@/lib/minio";
import { requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/knowledge-base/files/[id]">,
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    requirePermission(session.user.role as string | null | undefined, "knowledge_base", "read");
  } catch {
    return Response.json({ error: "Insufficient permissions." }, { status: 403 });
  }

  const { id } = await context.params;
  const [document] = await db
    .select({
      fileName: kbDocuments.fileName,
      filePath: kbDocuments.filePath,
      fileType: kbDocuments.fileType,
    })
    .from(kbDocuments)
    .where(eq(kbDocuments.id, id))
    .limit(1);

  if (!document) {
    return Response.json({ error: "Document not found." }, { status: 404 });
  }

  if (!document.fileName || !document.filePath) {
    return Response.json({ error: "This knowledge base entry has no uploaded file." }, { status: 404 });
  }

  try {
    const file = await downloadFile(document.filePath);
    return new Response(new Uint8Array(file), {
      status: 200,
      headers: buildInlineFileHeaders(document.fileName, document.fileType),
    });
  } catch (error) {
    console.error("[KB File] Failed to load uploaded document", { documentId: id, error });
    return Response.json(
      { error: "The uploaded file is currently unavailable." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
