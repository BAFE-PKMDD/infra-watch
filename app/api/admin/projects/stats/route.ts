import { NextResponse } from "next/server";

import { getAdminProjectStats } from "@/lib/abemis/sync";
import { requirePermission } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    requirePermission(user.role as string | null | undefined, "projects", "list");

    return NextResponse.json({
      success: true,
      statistics: await getAdminProjectStats(),
    });
  } catch (error) {
    const status = error instanceof Error && (error as Error & { status?: number }).status ? (error as Error & { status: number }).status : 500;

    return NextResponse.json(
      {
        error: status === 403 ? "Forbidden" : "Failed to fetch project statistics",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status },
    );
  }
}
