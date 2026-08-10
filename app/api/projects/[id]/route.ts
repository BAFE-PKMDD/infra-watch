import { NextResponse } from "next/server";
import { getProjectPreview } from "@/actions/query/project-preview.query";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await getProjectPreview(id);

  if (!result.data) {
    return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: result.data });
}
