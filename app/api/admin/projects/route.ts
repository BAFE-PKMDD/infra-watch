import { NextRequest, NextResponse } from "next/server";

import { getAdminProjects } from "@/lib/abemis/sync";
import { requirePermission } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    requirePermission(user.role as string | null | undefined, "projects", "list");

    const params = request.nextUrl.searchParams;
    const result = await getAdminProjects({
      search: params.get("search") ?? undefined,
      status: params.get("status") ?? undefined,
      program: params.get("program") ?? undefined,
      region: params.get("region") ?? undefined,
      province: params.get("province") ?? undefined,
      page: Number(params.get("page") ?? 1),
      pageSize: Number(params.get("pageSize") ?? 25),
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const status = error instanceof Error && (error as Error & { status?: number }).status ? (error as Error & { status: number }).status : 500;

    return NextResponse.json(
      {
        error: status === 403 ? "Forbidden" : "Failed to fetch projects",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status },
    );
  }
}
