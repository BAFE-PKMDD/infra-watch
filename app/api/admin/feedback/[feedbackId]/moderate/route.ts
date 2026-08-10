import { NextRequest, NextResponse } from "next/server";
import { moderateFeedback } from "@/actions/mutation/feedback.mutation";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ feedbackId: string }> },
) {
  const { feedbackId } = await params;
  const body = await request.json().catch(() => ({}));

  const result = await moderateFeedback({
    feedbackId,
    status: body.status,
    moderationNote: body.moderationNote,
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error ?? "Failed to moderate feedback" },
      { status: result.status ?? 500 },
    );
  }

  return NextResponse.json(result);
}
