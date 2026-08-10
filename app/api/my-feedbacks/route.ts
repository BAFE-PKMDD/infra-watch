import { NextResponse } from "next/server";

import { getMyFeedback } from "@/actions/query/feedback.query";

export const runtime = "nodejs";

export async function GET() {
  const result = await getMyFeedback();

  if (!result.success) {
    const isUnauthorized = result.error?.includes("Unauthorized");
    return NextResponse.json(result, { status: isUnauthorized ? 401 : 500 });
  }

  return NextResponse.json(result);
}
