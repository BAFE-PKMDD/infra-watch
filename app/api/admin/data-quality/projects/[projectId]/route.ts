import { NextResponse } from "next/server";

export const runtime = "nodejs";

const READ_ONLY_MESSAGE = "Data Quality provides recommendations only and cannot change project records.";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  void request;
  void context;
  return NextResponse.json(
    { error: READ_ONLY_MESSAGE },
    {
      status: 405,
      headers: {
        Allow: "GET",
        "Cache-Control": "private, no-store",
      },
    },
  );
}
