import { SMS_MOCK_SCENARIOS } from "@/lib/sms-grievance/mock-fixtures";
import { parseSmsCoordinates } from "@/lib/sms-grievance/location";
import type { SmsMockScenario } from "@/types/sms-grievance.types";

// Public, unauthenticated feed of raw inbound SMS text — see docs/current-system/feature-catalog.md
// section 4.6. Messages arrive completely untriaged (no category, project match, or relevance
// decision), so every mapped record starts in the same "needs_relevance_review" state a staff
// member would use for a message that doesn't follow the reporting template.
const DEFAULT_GRIEVANCE_API_URL = "https://bafe.obxsolution.com/api/greivances";

export type RawSmsGrievanceMessage = {
  id: number;
  sms_id: string;
  sms_number: string;
  sms_content: string;
  sms_receive_date: string;
  sms_receive_time: string;
  location: string;
  status: number;
  month: string;
  year: number;
};

type RawSmsGrievanceResponse = {
  messages: unknown[];
};

export class SmsGrievanceFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SmsGrievanceFetchError";
  }
}

function resolveGrievanceApiUrl() {
  return process.env.SMS_GRIEVANCE_API_URL?.trim() || DEFAULT_GRIEVANCE_API_URL;
}

function isRawSmsGrievanceMessage(value: unknown): value is RawSmsGrievanceMessage {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<RawSmsGrievanceMessage>;
  return typeof record.id === "number"
    && typeof record.sms_content === "string"
    && typeof record.sms_receive_date === "string"
    && typeof record.sms_receive_time === "string";
}

// The upstream line marks a missing sender with the literal string "null" instead of
// omitting the field or sending JSON null.
function normalizeContactNumber(rawValue: string | undefined): string {
  const trimmed = (rawValue ?? "").trim();
  if (!trimmed || trimmed.toLowerCase() === "null") return "Not provided";
  return trimmed;
}

// Interprets "MM/DD/YYYY" + "hh:mm:ss AM/PM" as Asia/Manila local time (the line only serves
// Philippine senders and the API carries no timezone of its own) and converts to UTC, rather
// than depending on the server process's local timezone to parse it correctly.
const MANILA_UTC_OFFSET_MINUTES = 8 * 60;

export function parsePhReceivedAt(dateValue: string, timeValue: string): string | null {
  const dateMatch = dateValue.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const timeMatch = timeValue.trim().match(/^(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i);
  if (!dateMatch || !timeMatch) return null;

  const [, monthStr, dayStr, yearStr] = dateMatch;
  const [, hourStr, minuteStr, secondStr, meridiem] = timeMatch;
  let hour = Number(hourStr) % 12;
  if (meridiem.toUpperCase() === "PM") hour += 12;

  const utcMillis = Date.UTC(Number(yearStr), Number(monthStr) - 1, Number(dayStr), hour, Number(minuteStr), Number(secondStr))
    - MANILA_UTC_OFFSET_MINUTES * 60 * 1000;
  if (Number.isNaN(utcMillis)) return null;
  return new Date(utcMillis).toISOString();
}

// Raw location is a bare "lat,lng" pair with no place name — show it plainly rather than
// inventing a barangay/municipality the line never provided.
export function formatLiveLocationLabel(rawLocation: string | undefined): string {
  const trimmed = (rawLocation ?? "").trim();
  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return trimmed || "Location not provided";
  const [, lat, lng] = match;
  return `Coordinates ${lat}, ${lng} (no place name provided)`;
}

export function mapRawGrievanceToRecord(raw: RawSmsGrievanceMessage): SmsMockScenario {
  const receivedAt = parsePhReceivedAt(raw.sms_receive_date, raw.sms_receive_time) ?? new Date(0).toISOString();
  const contactNumber = normalizeContactNumber(raw.sms_number || raw.sms_id);
  const originalText = raw.sms_content ?? "";
  const id = `live-sms-${raw.id}`;

  return {
    id,
    scenario: "live_import",
    prototype: true,
    externalMessageId: `BAFE-SMS-${raw.id}`,
    conversationId: `live-conversation-${raw.id}`,
    receivedAt,
    originalText,
    contactNumber,
    senderMode: "anonymous",
    relevance: "uncertain",
    relevanceReason: "Imported from the live SMS grievance line and not yet reviewed. Confirm relevance and match it to an actual BAFE project before treating this as a case.",
    status: "needs_relevance_review",
    category: null,
    categoryLabel: "Not yet classified",
    locationLabel: formatLiveLocationLabel(raw.location),
    coordinates: parseSmsCoordinates(raw.location),
    projectLabel: "Not yet identified",
    projectMatch: "not_identified",
    sensitive: false,
    urgentReview: false,
    deliveryStatus: "not_requested",
    language: "Unknown",
    conversation: [
      {
        id: `${id}-inbound`,
        kind: "inbound_sms",
        body: originalText,
        occurredAt: receivedAt,
        deliveryStatus: "not_requested",
      },
    ],
  };
}

async function fetchRawGrievanceMessages(): Promise<RawSmsGrievanceMessage[]> {
  const url = resolveGrievanceApiUrl();

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    throw new SmsGrievanceFetchError(`Could not reach the SMS grievance API: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!response.ok) {
    throw new SmsGrievanceFetchError(`SMS grievance API returned status ${response.status}`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new SmsGrievanceFetchError("SMS grievance API returned a response that was not valid JSON");
  }

  const messages = (data as Partial<RawSmsGrievanceResponse> | null)?.messages;
  if (!Array.isArray(messages)) {
    throw new SmsGrievanceFetchError("SMS grievance API response did not include a messages array");
  }

  return messages.filter(isRawSmsGrievanceMessage);
}

export async function fetchLiveSmsGrievanceRecords(): Promise<SmsMockScenario[]> {
  const rawMessages = await fetchRawGrievanceMessages();
  return rawMessages.map(mapRawGrievanceToRecord);
}

export type SmsGrievanceQueue = {
  records: SmsMockScenario[];
  dataSource: "live" | "sample";
  liveFetchError: boolean;
};

// Falls back to the deterministic sample set on any failure (unreachable host, non-2xx,
// malformed body) so the review page still renders something coherent during an outage,
// while telling staff plainly that what they're looking at is not real.
export async function getSmsGrievanceQueue(): Promise<SmsGrievanceQueue> {
  try {
    const records = await fetchLiveSmsGrievanceRecords();
    return { records, dataSource: "live", liveFetchError: false };
  } catch (error) {
    console.error("[SMS Grievance] Falling back to sample messages:", error instanceof Error ? error.message : error);
    return { records: SMS_MOCK_SCENARIOS, dataSource: "sample", liveFetchError: true };
  }
}
