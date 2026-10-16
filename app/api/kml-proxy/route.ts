import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { fetchKml, KmlSourceError } from "@/lib/kml-source";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface ProjectMetadata {
  kmllink?: string | { url: string } | null;
}

function extractKmlUrl(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const meta = metadata as ProjectMetadata;
  const kmllink = meta.kmllink;
  if (!kmllink) return null;
  if (typeof kmllink === "string") return kmllink;
  if (typeof kmllink === "object" && "url" in kmllink && typeof kmllink.url === "string") {
    return kmllink.url;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { error: "projectId query parameter is required" },
      { status: 400 },
    );
  }

  try {
    const condition = UUID_RE.test(projectId)
      ? or(
        eq(projects.id, projectId),
        eq(projects.abemisId, projectId),
        eq(projects.projectCode, projectId),
      )
      : or(
        eq(projects.abemisId, projectId),
        eq(projects.projectCode, projectId),
      );

    const [project] = await db
      .select({
        metadata: projects.metadata,
      })
      .from(projects)
      .where(condition)
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const kmlUrl = extractKmlUrl(project.metadata);

    if (!kmlUrl) {
      return NextResponse.json(
        { error: "No KML link available for this project" },
        { status: 404 },
      );
    }

    const kmlContent = await fetchKml(kmlUrl);

    return new NextResponse(kmlContent, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox; default-src 'none'",
      },
    });
  } catch (error) {
    console.error("KML proxy error:", error);

    if (error instanceof KmlSourceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof DOMException && error.name === "TimeoutError") {
      return NextResponse.json(
        { error: "KML source server timed out" },
        { status: 504 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
