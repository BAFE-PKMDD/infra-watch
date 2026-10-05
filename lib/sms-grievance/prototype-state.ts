import { buildBafeCaseOpenedReply, buildNotBafeProjectReply, mintSmsGrievanceCaseId } from "@/lib/sms-grievance/auto-response";
import { getSmsCategoryLabel } from "@/lib/sms-grievance/categories";
import { canTransitionSmsCase } from "@/lib/sms-grievance/policy";
import type { SmsCaseStatus, SmsCategory, SmsMockScenario, SmsNotBafeCategory, SmsProjectTag } from "@/types/sms-grievance.types";

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
  | { type: "mark_not_bafe_project"; reason: string; category: SmsNotBafeCategory }
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

export type ApplyActionOptions = {
  // True when the record is a real message from the live SMS line: outbound replies are
  // plain gateway text (no "SAMPLE SMS ONLY" prefix) that start out "simulated_pending"
  // until the server actually sends them, and events carry the real clock time instead of
  // the fixed prototype timestamps. Defaults to the sandbox/prototype behavior.
  live?: boolean;
  now?: string;
};

const PROTOTYPE_EVENT_TIME = "2026-09-19T09:15:00.000Z";
const PROTOTYPE_STATUS_TIME = "2026-09-19T09:30:00.000Z";

export function applySmsPrototypeAction(candidate: SmsMockScenario, action: PrototypeAction, options: ApplyActionOptions = {}): SmsMockScenario {
  const live = options.live === true;
  const now = options.now ?? new Date().toISOString();
  const eventTime = (fallback: string) => (live ? now : fallback);
  const outboundStatus = live ? "simulated_pending" as const : "simulated_delivered" as const;
  if (action.type === "accept") {
    if (candidate.status !== "needs_relevance_review") throw new Error("This action is available only while the sample needs checking.");
    const location = requireText(action.location, "Location tag");
    const assignedUnit = requireText(action.unit, "Responsible office or review team");
    const assignedRegion = requireText(action.region, "Region tag");
    if (!action.confirmed) throw new Error("Moderator or admin confirmation is required before creating the sample case.");
    const certainty = action.certainty ?? "confirmed";
    // A "confirmed" BAFE project still needs an actual matched project record. A
    // "possible" tag can proceed without one — e.g. a report about distributed farm
    // equipment (a hand tractor) that was never a built infrastructure project in the
    // first place — and gets routed for follow-up checking instead of blocking staff.
    const project = certainty === "possible" && !action.project ? null : requireProject(action.project);
    const smsGrievanceCaseId = mintSmsGrievanceCaseId(candidate);
    return {
      ...candidate,
      relevance: certainty === "possible" ? "uncertain" : "confirmed_in_scope",
      relevanceReason: requireText(action.relevanceReason, "Relevance reason"),
      // Accepting already means the case is tagged, routed to a region, and ready for
      // staff to act on — there's no separate "waiting" stop before "being reviewed".
      status: "under_review",
      category: action.category,
      categoryLabel: getSmsCategoryLabel(action.category),
      locationLabel: location,
      assignedUnit,
      assignedRegion,
      smsGrievanceCaseId,
      projectMatch: project ? (certainty === "possible" ? "candidate" : "confirmed") : "not_identified",
      projectId: project?.id,
      projectCode: project?.code,
      projectProvince: project?.province,
      projectMunicipality: project?.municipality,
      projectLabel: project?.name ?? "Not yet identified — needs further checking",
      deliveryStatus: outboundStatus,
      conversation: [
        ...candidate.conversation,
        {
          id: `${candidate.id}-prototype-event-${candidate.conversation.length + 1}`,
          kind: "outbound_sms",
          body: buildBafeCaseOpenedReply(smsGrievanceCaseId, { live }),
          occurredAt: eventTime(PROTOTYPE_EVENT_TIME),
          deliveryStatus: outboundStatus,
        },
      ],
    };
  }

  if (action.type === "mark_not_bafe_project") {
    if (candidate.status !== "needs_relevance_review") throw new Error("This action is available only while the sample needs checking.");
    const reason = requireText(action.reason, "Reason");
    const dismissed: SmsMockScenario = {
      ...candidate,
      relevance: "out_of_scope",
      relevanceReason: reason,
      status: "closed",
      projectMatch: "not_bafe_project",
      projectLabel: "Not a BAFE project",
      notBafeCategory: action.category,
      projectId: undefined,
      projectCode: undefined,
      projectProvince: undefined,
      projectMunicipality: undefined,
    };
    // A real message dismissed as not-BAFE is just filed away: the sender is not texted.
    if (live) return dismissed;
    return {
      ...dismissed,
      deliveryStatus: "simulated_delivered",
      conversation: [
        ...candidate.conversation,
        {
          id: `${candidate.id}-prototype-event-${candidate.conversation.length + 1}`,
          kind: "outbound_sms",
          body: buildNotBafeProjectReply(reason, action.category),
          occurredAt: PROTOTYPE_EVENT_TIME,
          deliveryStatus: "simulated_delivered",
        },
      ],
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
      // Its content now lives in the case it's linked to, so it drops out of "Needs
      // checking" instead of sitting there as a second, now-redundant item to review.
      status: "closed",
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
          body: `${live ? "Status" : "Prototype status"} changed to ${action.to.replaceAll("_", " ")}. Reason: ${reason}`,
          occurredAt: eventTime(PROTOTYPE_STATUS_TIME),
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
      deliveryStatus: outboundStatus,
      conversation: [
        ...candidate.conversation,
        {
          id: `${candidate.id}-prototype-event-${eventNumber}`,
          kind: "outbound_sms",
          body: live ? body : `SAMPLE SMS ONLY. No message was sent. ${body}`,
          occurredAt: eventTime(PROTOTYPE_STATUS_TIME),
          deliveryStatus: outboundStatus,
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
        occurredAt: eventTime(PROTOTYPE_STATUS_TIME),
      },
    ],
  };
}
