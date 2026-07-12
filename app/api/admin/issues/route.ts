import { NextRequest, NextResponse } from "next/server";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";

import { formatAdminIssue, requireIssuePermission, toDbIssueStatus } from "@/lib/admin-issues";
import { db } from "@/lib/db";
import { issues, projects } from "@/lib/db/schema";
import { getIssueScopeCondition } from "@/lib/scope";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await requireIssuePermission(request, "list");
    const params = request.nextUrl.searchParams;
    const page = Math.max(Number(params.get("page") ?? 1), 1);
    const limit = Math.min(Math.max(Number(params.get("limit") ?? 10), 1), 50);
    const status = toDbIssueStatus(params.get("status"));
    const search = params.get("search")?.trim();
    const conditions = [];

    if (status) {
      conditions.push(status === "pending" ? or(eq(issues.status, "pending"), eq(issues.status, "submitted")) : eq(issues.status, status));
    }

    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(issues.ticketNumber, pattern),
          ilike(issues.description, pattern),
          ilike(issues.category, pattern),
          ilike(issues.province, pattern),
          ilike(issues.municipality, pattern),
          ilike(issues.barangay, pattern),
          ilike(issues.reporterName, pattern),
          ilike(projects.name, pattern),
        ),
      );
    }

    const scopeCondition = await getIssueScopeCondition(user);
    if (scopeCondition) {
      conditions.push(scopeCondition);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (page - 1) * limit;

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: issues.id,
          ticketNumber: issues.ticketNumber,
          projectId: issues.projectId,
          reporterUserId: issues.reporterUserId,
          reporterName: issues.reporterName,
          reporterContact: issues.reporterContact,
          reporterEmail: issues.reporterEmail,
          isAnonymous: issues.isAnonymous,
          category: issues.category,
          status: issues.status,
          priority: issues.priority,
          description: issues.description,
          region: issues.region,
          province: issues.province,
          municipality: issues.municipality,
          barangay: issues.barangay,
          landmark: issues.landmark,
          evidence: issues.evidence,
          resolvedAt: issues.resolvedAt,
          createdAt: issues.createdAt,
          updatedAt: issues.updatedAt,
          projectName: projects.name,
        })
        .from(issues)
        .leftJoin(projects, eq(projects.abemisId, issues.projectId))
        .where(whereClause)
        .orderBy(desc(issues.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(issues).leftJoin(projects, eq(projects.abemisId, issues.projectId)).where(whereClause),
    ]);

    const total = Number(totalRows[0]?.value ?? 0);

    return NextResponse.json({
      success: true,
      data: rows.map(formatAdminIssue),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed to load issues" }, { status });
  }
}
