import { NextResponse } from "next/server";

import { getMyIssues } from "@/actions/query/issues.query";

export const runtime = "nodejs";

export async function GET() {
  const result = await getMyIssues();

  if (!result.success) {
    const isUnauthorized = result.error?.includes("Unauthorized");
    return NextResponse.json(result, { status: isUnauthorized ? 401 : 500 });
  }

  return NextResponse.json(result);
}
