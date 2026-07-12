import { NextResponse } from "next/server";
import { deleteFeedback } from "@/actions/mutation/feedback.mutation";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ feedbackId: string }> },
) {
  const { feedbackId } = await params;
  const result = await deleteFeedback(feedbackId);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error ?? "Failed to delete feedback" },
      { status: result.status ?? 500 },
    );
  }

  return NextResponse.json(result);
}
