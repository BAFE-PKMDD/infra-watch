import "server-only";

import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  checklistPhases,
  checklistTemplateItems,
  checklistTemplates,
  projectChecklistItems,
  projectChecklists,
} from "@/lib/db/schema";

export const checklistStatusOptions = ["pending", "in_progress", "needs_review", "completed", "blocked"] as const;
export type ChecklistItemStatus = (typeof checklistStatusOptions)[number];

export const checklistStatusLabels: Record<ChecklistItemStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  needs_review: "Needs review",
  completed: "Completed",
  blocked: "Blocked",
};

const phaseSeed = [
  {
    code: "planning",
    name: "Planning",
    description: "Scope, budget, site, and procurement readiness checks.",
    gateLabel: "Ready for validation",
    sortOrder: 10,
  },
  {
    code: "validation",
    name: "Validation",
    description: "Document, geotag, beneficiary, and compliance validation.",
    gateLabel: "Ready for implementation",
    sortOrder: 20,
  },
  {
    code: "implementation",
    name: "Implementation",
    description: "Physical delivery, progress, and variation monitoring.",
    gateLabel: "Ready for inspection",
    sortOrder: 30,
  },
  {
    code: "inspection",
    name: "Inspection",
    description: "Inspection findings, punch list, and acceptance evidence.",
    gateLabel: "Ready for completion",
    sortOrder: 40,
  },
  {
    code: "completion",
    name: "Completion",
    description: "Turnover, public disclosure, and archive closeout.",
    gateLabel: "Closed",
    sortOrder: 50,
  },
] as const;

const templateCode = "infra-standard-phase-checklist";

const templateItemSeed = [
  {
    code: "plan-01",
    phaseCode: "planning",
    title: "Approved program of works uploaded",
    description: "POW, quantity breakdown, and cost estimates are complete.",
    evidenceRequired: true,
    sortOrder: 10,
  },
  {
    code: "plan-02",
    phaseCode: "planning",
    title: "Site coordinates and scope boundary confirmed",
    description: "Location details match project records and field coordinates.",
    evidenceRequired: true,
    sortOrder: 20,
  },
  {
    code: "val-01",
    phaseCode: "validation",
    title: "Beneficiary and LGU validation completed",
    description: "Recipient organization, LGU, and project ownership are verified.",
    evidenceRequired: false,
    sortOrder: 30,
  },
  {
    code: "val-02",
    phaseCode: "validation",
    title: "Procurement milestone documents checked",
    description: "Bid, award, contract, and notice-to-proceed references are aligned.",
    evidenceRequired: true,
    sortOrder: 40,
  },
  {
    code: "imp-01",
    phaseCode: "implementation",
    title: "Physical progress reconciled with S-curve",
    description: "Reported progress is matched against field observation and plan targets.",
    evidenceRequired: true,
    sortOrder: 50,
  },
  {
    code: "imp-02",
    phaseCode: "implementation",
    title: "Variation, delay, or suspension notes reviewed",
    description: "Any deviation has documented reason, approval, and recovery action.",
    evidenceRequired: false,
    sortOrder: 60,
  },
  {
    code: "insp-01",
    phaseCode: "inspection",
    title: "Inspection report and punch list recorded",
    description: "Defects, acceptance notes, and accountable parties are captured.",
    evidenceRequired: true,
    sortOrder: 70,
  },
  {
    code: "insp-02",
    phaseCode: "inspection",
    title: "Geotagged completion photos reviewed",
    description: "Photos are location-valid, dated, and tied to the inspected scope.",
    evidenceRequired: true,
    sortOrder: 80,
  },
  {
    code: "comp-01",
    phaseCode: "completion",
    title: "Turnover and acceptance documents archived",
    description: "Final acceptance, turnover, and warranty documents are stored.",
    evidenceRequired: true,
    sortOrder: 90,
  },
  {
    code: "comp-02",
    phaseCode: "completion",
    title: "Public disclosure status updated",
    description: "Completion status, final progress, and public-facing records are current.",
    evidenceRequired: false,
    sortOrder: 100,
  },
] as const;

const projectChecklistSeed = [
  {
    projectCode: "PRJ-INS-2025-115",
    projectName: "Solar Powered Irrigation Pump System",
    projectLocation: "Dingle, Abuyog, Leyte",
    status: "in_progress",
    currentPhaseCode: "implementation",
    dueDate: "2026-08-15T00:00:00.000Z",
    itemStatuses: {
      "plan-01": "completed",
      "plan-02": "completed",
      "val-01": "completed",
      "val-02": "needs_review",
      "imp-01": "in_progress",
      "imp-02": "pending",
      "insp-01": "pending",
      "insp-02": "pending",
      "comp-01": "pending",
      "comp-02": "pending",
    },
  },
  {
    projectCode: "PRJ-AMSS-2024-042",
    projectName: "Post-Harvest Mechanical Grain Dryer Installation",
    projectLocation: "Lias, Balamban, Cebu",
    status: "in_progress",
    currentPhaseCode: "inspection",
    dueDate: "2026-07-31T00:00:00.000Z",
    itemStatuses: {
      "plan-01": "completed",
      "plan-02": "completed",
      "val-01": "completed",
      "val-02": "completed",
      "imp-01": "completed",
      "imp-02": "completed",
      "insp-01": "needs_review",
      "insp-02": "in_progress",
      "comp-01": "pending",
      "comp-02": "pending",
    },
  },
  {
    projectCode: "PRJ-AMSS-2026-002",
    projectName: "Agricultural Warehouse and Storage Facility",
    projectLocation: "Simeon, Basey, Samar",
    status: "in_progress",
    currentPhaseCode: "planning",
    dueDate: "2026-09-30T00:00:00.000Z",
    itemStatuses: {
      "plan-01": "in_progress",
      "plan-02": "blocked",
      "val-01": "pending",
      "val-02": "pending",
      "imp-01": "pending",
      "imp-02": "pending",
      "insp-01": "pending",
      "insp-02": "pending",
      "comp-01": "pending",
      "comp-02": "pending",
    },
  },
] as const;

export async function ensureChecklistSeedData() {
  await db
    .insert(checklistPhases)
    .values(phaseSeed.map((phase) => ({ ...phase })))
    .onConflictDoNothing({ target: checklistPhases.code });

  const phases = await db.select().from(checklistPhases).orderBy(asc(checklistPhases.sortOrder));
  const phasesByCode = new Map(phases.map((phase) => [phase.code, phase]));

  const [template] = await db
    .insert(checklistTemplates)
    .values({
      code: templateCode,
      name: "INFRA standard phased checklist",
      description: "Default checklist template for AMEFIP infrastructure monitoring.",
      projectType: "infrastructure",
      isActive: true,
    })
    .onConflictDoNothing({ target: checklistTemplates.code })
    .returning();

  const activeTemplate =
    template ??
    (
      await db
        .select()
        .from(checklistTemplates)
        .where(eq(checklistTemplates.code, templateCode))
        .limit(1)
    )[0];

  if (!activeTemplate) {
    throw new Error("Unable to initialize checklist template.");
  }

  for (const item of templateItemSeed) {
    const phase = phasesByCode.get(item.phaseCode);
    if (!phase) {
      throw new Error(`Missing checklist phase: ${item.phaseCode}`);
    }

    await db
      .insert(checklistTemplateItems)
      .values({
        templateId: activeTemplate.id,
        phaseId: phase.id,
        code: item.code,
        title: item.title,
        description: item.description,
        evidenceRequired: item.evidenceRequired,
        requiredRole: "moderator",
        sortOrder: item.sortOrder,
      })
      .onConflictDoNothing({
        target: [checklistTemplateItems.templateId, checklistTemplateItems.code],
      });
  }

  const templateItems = await db
    .select()
    .from(checklistTemplateItems)
    .where(eq(checklistTemplateItems.templateId, activeTemplate.id))
    .orderBy(asc(checklistTemplateItems.sortOrder));

  const templateItemsByCode = new Map(templateItems.map((item) => [item.code, item]));

  for (const project of projectChecklistSeed) {
    const currentPhase = phasesByCode.get(project.currentPhaseCode);
    const [insertedChecklist] = await db
      .insert(projectChecklists)
      .values({
        projectCode: project.projectCode,
        projectName: project.projectName,
        projectLocation: project.projectLocation,
        templateId: activeTemplate.id,
        status: project.status,
        currentPhaseId: currentPhase?.id,
        dueDate: new Date(project.dueDate),
      })
      .onConflictDoNothing({ target: projectChecklists.projectCode })
      .returning();

    const checklist =
      insertedChecklist ??
      (
        await db
          .select()
          .from(projectChecklists)
          .where(eq(projectChecklists.projectCode, project.projectCode))
          .limit(1)
      )[0];

    if (!checklist) {
      continue;
    }

    for (const item of templateItemSeed) {
      const templateItem = templateItemsByCode.get(item.code);
      const itemPhase = phasesByCode.get(item.phaseCode);
      if (!templateItem || !itemPhase) {
        continue;
      }

      const status = (project.itemStatuses[item.code as keyof typeof project.itemStatuses] ?? "pending") as ChecklistItemStatus;
      await db
        .insert(projectChecklistItems)
        .values({
          checklistId: checklist.id,
          templateItemId: templateItem.id,
          phaseId: itemPhase.id,
          status,
          completedAt: status === "completed" ? new Date("2026-07-01T00:00:00.000Z") : null,
          sortOrder: templateItem.sortOrder,
        })
        .onConflictDoNothing({
          target: [projectChecklistItems.checklistId, projectChecklistItems.templateItemId],
        });
    }
  }
}

function getCompletionPercent(items: Array<{ status: string }>) {
  if (items.length === 0) {
    return 0;
  }

  const completed = items.filter((item) => item.status === "completed").length;
  return Math.round((completed / items.length) * 100);
}

function getStatusCounts(items: Array<{ status: string }>) {
  return checklistStatusOptions.reduce<Record<ChecklistItemStatus, number>>(
    (counts, status) => {
      counts[status] = items.filter((item) => item.status === status).length;
      return counts;
    },
    {
      pending: 0,
      in_progress: 0,
      needs_review: 0,
      completed: 0,
      blocked: 0,
    },
  );
}

export async function getChecklistDashboardData() {
  await ensureChecklistSeedData();

  const [phases, templateItems, checklists, items] = await Promise.all([
    db.select().from(checklistPhases).orderBy(asc(checklistPhases.sortOrder)),
    db.select().from(checklistTemplateItems).orderBy(asc(checklistTemplateItems.sortOrder)),
    db.select().from(projectChecklists).orderBy(desc(projectChecklists.updatedAt)),
    db.select().from(projectChecklistItems).orderBy(asc(projectChecklistItems.sortOrder)),
  ]);

  const templateItemsById = new Map(templateItems.map((item) => [item.id, item]));
  const phasesById = new Map(phases.map((phase) => [phase.id, phase]));
  const itemsByChecklist = new Map<string, typeof items>();

  for (const item of items) {
    const current = itemsByChecklist.get(item.checklistId) ?? [];
    current.push(item);
    itemsByChecklist.set(item.checklistId, current);
  }

  const checklistRows = checklists.map((checklist) => {
    const checklistItems = itemsByChecklist.get(checklist.id) ?? [];
    const currentPhase = checklist.currentPhaseId ? phasesById.get(checklist.currentPhaseId) : null;
    const enrichedItems = checklistItems.map((item) => {
      const templateItem = templateItemsById.get(item.templateItemId);
      const phase = phasesById.get(item.phaseId);

      return {
        id: item.id,
        status: item.status as ChecklistItemStatus,
        remarks: item.remarks,
        completedAt: item.completedAt,
        phaseCode: phase?.code ?? "unknown",
        phaseName: phase?.name ?? "Unassigned",
        title: templateItem?.title ?? "Untitled checklist item",
        description: templateItem?.description ?? null,
        evidenceRequired: Boolean(templateItem?.evidenceRequired),
        sortOrder: item.sortOrder,
      };
    });

    return {
      id: checklist.id,
      projectCode: checklist.projectCode,
      projectName: checklist.projectName,
      projectLocation: checklist.projectLocation,
      status: checklist.status,
      dueDate: checklist.dueDate,
      updatedAt: checklist.updatedAt,
      currentPhase: currentPhase
        ? {
            code: currentPhase.code,
            name: currentPhase.name,
            gateLabel: currentPhase.gateLabel,
          }
        : null,
      completionPercent: getCompletionPercent(enrichedItems),
      statusCounts: getStatusCounts(enrichedItems),
      items: enrichedItems,
    };
  });

  const allItems = checklistRows.flatMap((checklist) => checklist.items);
  const totalCompleted = allItems.filter((item) => item.status === "completed").length;

  const phaseSummaries = phases.map((phase) => {
    const phaseItems = allItems.filter((item) => item.phaseCode === phase.code);
    return {
      code: phase.code,
      name: phase.name,
      description: phase.description,
      gateLabel: phase.gateLabel,
      sortOrder: phase.sortOrder,
      total: phaseItems.length,
      completed: phaseItems.filter((item) => item.status === "completed").length,
      blocked: phaseItems.filter((item) => item.status === "blocked").length,
      needsReview: phaseItems.filter((item) => item.status === "needs_review").length,
      completionPercent: getCompletionPercent(phaseItems),
    };
  });

  const now = new Date();
  const fourteenDaysFromNow = new Date(now);
  fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);

  return {
    checklists: checklistRows,
    phaseSummaries,
    stats: {
      totalChecklists: checklistRows.length,
      totalItems: allItems.length,
      completedItems: totalCompleted,
      blockedItems: allItems.filter((item) => item.status === "blocked").length,
      needsReviewItems: allItems.filter((item) => item.status === "needs_review").length,
      completionPercent: getCompletionPercent(allItems),
      dueSoon: checklistRows.filter(
        (checklist) => checklist.dueDate && checklist.dueDate >= now && checklist.dueDate <= fourteenDaysFromNow,
      ).length,
    },
  };
}