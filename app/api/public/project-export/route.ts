import { parsePublicProjectDirectoryState } from "@/lib/public-project-directory";
import { exportPublicProjects, projectExportCsv } from "@/lib/project-export";
import { apiError } from "@/lib/staff-api";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const rows = await exportPublicProjects(
      parsePublicProjectDirectoryState(params),
    );
    if (params.get("format") === "csv")
      return new Response(projectExportCsv(rows), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="infrawatch-projects.csv"',
          "Cache-Control": "no-store",
        },
      });
    return Response.json(
      { data: rows, exportedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
