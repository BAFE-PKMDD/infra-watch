import { NextRequest, NextResponse } from "next/server";
import { getAllFeedback } from "@/actions/query/feedback.query";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const result = await getAllFeedback({
    status: params.get("status") ?? undefined,
    search: params.get("search") ?? undefined,
    page: Number(params.get("page") ?? 1),
    limit: Number(params.get("limit") ?? params.get("pageSize") ?? 10),
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error ?? "Failed to fetch feedback" },
      { status: result.status ?? 500 },
    );
  }

  return NextResponse.json(result);
}
