import { canTransitionSmsCase } from "@/lib/sms-grievance/policy";
import type { SmsCaseStatus, SmsCategory, SmsMockScenario, SmsProjectTag } from "@/types/sms-grievance.types";

export const SMS_CATEGORY_LABELS: Record<SmsCategory, string> = {
  project_delay: "Project delay or stopped work",
  damaged_infrastructure: "Damaged or defective infrastructure",
  construction_quality: "Construction quality concern",
  safety_hazard: "Safety hazard",
  flooding_drainage: "Flooding or drainage concern",
  blocked_access: "Blocked access or public inconvenience",
  budget_procurement_payment: "Budget, procurement, supplier, or payment concern",
  misconduct_corruption: "Misconduct, improper request, or suspected corruption",
  incorrect_project_information: "Incorrect or missing project information",
  other_infrastructure: "Other infrastructure concern",
};

export type PrototypeAction =
  | {
      type: "accept";
      category: SmsCategory;
      relevanceReason: string;
      location: string;
      unit: string;
      region: string;
      project: SmsProjectTag | null;
      confirmed: boolean;
      certainty?: "confirmed" | "possible";
    }
  | { type: "mark_not_bafe_project"; reason: string }
  | { type: "mark_unrelated"; reason: string }
  | { type: "mark_duplicate"; reason: string; duplicateOf: string }
  | { type: "assign"; unit: string; region: string; confirmed: boolean }
  | { type: "transition"; to: SmsCaseStatus; reason: string; authorized?: boolean }
  | { type: "restrict"; reason: string; authorized: boolean }
  | { type: "simulate_response"; body: string }
  | { type: "add_internal_note"; body: string };

function requireText(value: string, label: string) {
  if (!value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
}

function requireProject(project: SmsProjectTag | null): SmsProjectTag {
  if (!project) throw new Error("Select the actual BAFE project before creating the sample case.");
  return {
    ...project,
    id: requireText(project.id, "BAFE project ID"),
    name: requireText(project.name, "BAFE project name"),
  };
}

export function applySmsPrototypeAction(candidate: SmsMockScenario, action: PrototypeAction): SmsMockScenario {
  if (action.type === "accept") {
    if (candidate.status !== "needs_relevance_review") throw new Error("This action is available only while the sample needs checking.");
    const location = requireText(action.location, "Location tag");
    const assignedUnit = requireText(action.unit, "Responsible office or review team");
    const assignedRegion = requireText(action.region, "Region tag");
    if (!action.confirmed) throw new Error("Moderator or admin confirmation is required before creating the sample case.");
    const project = requireProject(action.project);
    const certainty = action.certainty ?? "confirmed";
    return {
      ...candidate,
      relevance: certainty === "possible" ? "uncertain" : "confirmed_in_scope",
      relevanceReason: requireText(action.relevanceReason, "Relevance reason"),
      status: "pending_review",
      category: action.category,
      categoryLabel: SMS_CATEGORY_LABELS[action.category],
      locationLabel: location,
      assignedUnit,
      assignedRegion,
      projectMatch: certainty === "possible" ? "candidate" : "confirmed",
      projectId: project.id,
      projectCode: project.code,
      projectProvince: project.province,
      projectMunicipality: project.municipality,
      projectLabel: project.name,
    };
  }

  if (action.type === "mark_not_bafe_project") {
    if (candidate.status !== "needs_relevance_review") throw new Error("This action is available only while the sample needs checking.");
    return {
      ...candidate,
      relevance: "out_of_scope",
      relevanceReason: requireText(action.reason, "Reason"),
      status: "closed",
      projectMatch: "not_bafe_project",
      projectLabel: "Not a BAFE project",
      projectId: undefined,
      projectCode: undefined,
      projectProvince: undefined,
      projectMunicipality: undefined,
    };
  }

  if (action.type === "mark_unrelated") {
    if (candidate.status !== "needs_relevance_review") throw new Error("This action is available only while the sample needs checking.");
    return {
      ...candidate,
      relevance: "out_of_scope",
      relevanceReason: requireText(action.reason, "Reason"),
    };
  }

  if (action.type === "mark_duplicate") {
    if (candidate.status !== "needs_relevance_review") throw new Error("This action is available only while the sample needs checking.");
    return {
      ...candidate,
      relevance: "duplicate",
      relevanceReason: requireText(action.reason, "Reason"),
      duplicateOf: requireText(action.duplicateOf, "Existing sample case reference"),
    };
  }


  if (action.type === "assign") {
    if (candidate.relevance !== "confirmed_in_scope") throw new Error("Create the sample case before assigning it.");
    if (!action.confirmed) throw new Error("Confirm the sample assignment before saving it.");
    return {
      ...candidate,
      assignedUnit: requireText(action.unit, "Assigned unit"),
      assignedRegion: requireText(action.region, "Assigned region"),
    };
  }

  if (action.type === "transition") {
    if (!canTransitionSmsCase(candidate.status, action.to)) {
      throw new Error("That status change isn't available from the case's current status.");
    }
    if (action.to === "resolved" && !candidate.assignedUnit) throw new Error("Assign a review team before marking this sample as resolved.");
    if (action.to === "closed" && !action.authorized) throw new Error("Authorization is required before closing this sample.");
    const reason = requireText(action.reason, "Review note");
    return {
      ...candidate,
      status: action.to,
      conversation: [
        ...candidate.conversation,
        {
          id: `${candidate.id}-prototype-event-${candidate.conversation.length + 1}`,
          kind: "status_event",
          body: `Prototype status changed to ${action.to.replaceAll("_", " ")}. Reason: ${reason}`,
          occurredAt: "2026-09-19T09:30:00.000Z",
        },
      ],
    };
  }

  if (action.type === "restrict") {
    if (!action.authorized) throw new Error("Authorization is required before limiting access to this sample.");
    return {
      ...candidate,
      sensitive: true,
      relevanceReason: `${candidate.relevanceReason} Restriction reason: ${requireText(action.reason, "Reason")}`,
    };
  }

  const body = requireText(action.body, action.type === "simulate_response" ? "Response" : "Internal note");
  const eventNumber = candidate.conversation.length + 1;

  if (action.type === "simulate_response") {
    return {
      ...candidate,
      deliveryStatus: "simulated_delivered",
      conversation: [
        ...candidate.conversation,
        {
          id: `${candidate.id}-prototype-event-${eventNumber}`,
          kind: "outbound_sms",
          body: `SAMPLE SMS ONLY. No message was sent. ${body}`,
          occurredAt: "2026-09-19T09:30:00.000Z",
          deliveryStatus: "simulated_delivered",
        },
      ],
    };
  }

  return {
    ...candidate,
    conversation: [
      ...candidate.conversation,
      {
        id: `${candidate.id}-prototype-event-${eventNumber}`,
        kind: "internal_note",
        body,
        occurredAt: "2026-09-19T09:30:00.000Z",
      },
    ],
  };
}
