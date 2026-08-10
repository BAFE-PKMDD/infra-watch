import { NextResponse } from "next/server";
import { getFeedbackStats } from "@/actions/query/feedback.query";

export const runtime = "nodejs";

export async function GET() {
  const result = await getFeedbackStats();

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error ?? "Failed to fetch feedback statistics" },
      { status: result.status ?? 500 },
    );
  }

  return NextResponse.json(result);
}
