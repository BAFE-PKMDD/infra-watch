import { NextResponse } from "next/server";

// Public project export is switched off while the project data is still being cleansed.
// To re-enable it, restore the previous handler: it parsed the directory filters with
// parsePublicProjectDirectoryState, called exportPublicProjects, and returned CSV
// (projectExportCsv) or JSON. The helpers in lib/project-export.ts are unchanged.
export async function GET() {
  return NextResponse.json(
    { error: "Project export is not available yet." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
