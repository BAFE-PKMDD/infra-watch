import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { shouldExcludeAnalyticsRole } from "@/lib/analytics/citizen-event-policy";
import { allowCitizenEventIngestion } from "@/lib/analytics/citizen-event-rate-limit";
import { recordCitizenEngagementEvent, type CitizenEventRecordResult } from "@/lib/analytics/citizen-event-service";
import { insertCitizenEngagementEvent, isKnownCitizenAnalyticsProject } from "@/lib/analytics/citizen-event-store";
import { resolveRequestNetworkRegion } from "@/lib/analytics/citizen-network-region-provider";

export const runtime = "nodejs";

const MAX_EVENT_BODY_BYTES = 4_096;

class CitizenEventBodyTooLargeError extends Error {}

async function readBoundedEventBody(request: Request): Promise<unknown | null> {
  const contentLength = Number.parseInt(request.headers.get("content-length") ?? "0", 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_EVENT_BODY_BYTES) {
    throw new CitizenEventBodyTooLargeError();
  }
  if (!request.body) return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_EVENT_BODY_BYTES) {
      await reader.cancel();
      throw new CitizenEventBodyTooLargeError();
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(body));
  } catch {
    return null;
  }
}

export type CitizenEventRouteDependencies = {
  getRole: (request: Request) => Promise<string | null | undefined>;
  resolveNetworkRegion?: (request: Request) => Promise<{ code: string; label: string } | null>;
  recordEvent: (
    input: unknown,
    role: string | null | undefined,
    resolveNetworkRegion?: () => Promise<{ code: string; label: string } | null>,
  ) => Promise<CitizenEventRecordResult>;
  allowRequest?: () => boolean;
};

const defaultDependencies: CitizenEventRouteDependencies = {
  getRole: async (request) => {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      return session ? session.user.role : null;
    } catch {
      return undefined;
    }
  },
  resolveNetworkRegion: resolveRequestNetworkRegion,
  recordEvent: (input, role, resolveNetworkRegion) => recordCitizenEngagementEvent({
    input,
    role,
    resolveNetworkRegion,
    isKnownProject: isKnownCitizenAnalyticsProject,
    insertEvent: insertCitizenEngagementEvent,
    reportError: () => console.error("Citizen engagement event storage unavailable"),
  }),
  allowRequest: allowCitizenEventIngestion,
};

export function createCitizenEventPostHandler(
  dependencies: CitizenEventRouteDependencies = defaultDependencies,
) {
  return async function POST(request: Request) {
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
      return NextResponse.json({ error: "JSON content type required" }, { status: 415 });
    }
    let input: unknown | null;
    try {
      input = await readBoundedEventBody(request);
    } catch (error) {
      if (error instanceof CitizenEventBodyTooLargeError) {
        return NextResponse.json({ error: "Payload too large" }, { status: 413 });
      }
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }
    if (input === null) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }
    if (dependencies.allowRequest && !dependencies.allowRequest()) {
      return NextResponse.json(
        { accepted: true },
        { status: 202, headers: { "Cache-Control": "no-store" } },
      );
    }

    const role = await dependencies.getRole(request);
    const resolveNetworkRegion = role !== undefined
      && !shouldExcludeAnalyticsRole(role)
      && dependencies.resolveNetworkRegion
      ? () => dependencies.resolveNetworkRegion!(request)
      : undefined;
    const result = await dependencies.recordEvent(input, role, resolveNetworkRegion);
    if (result === "invalid") {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    return NextResponse.json(
      { accepted: true },
      { status: 202, headers: { "Cache-Control": "no-store" } },
    );
  };
}

export const POST = createCitizenEventPostHandler();
