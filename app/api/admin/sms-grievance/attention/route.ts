import { NextResponse } from "next/server";

import { canAccessAdmin } from "@/lib/session";
import { smsAttention, smsAttentionStamp } from "@/lib/sms-grievance/attention";
import { getSmsGrievanceQueue } from "@/lib/sms-grievance/live-source";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The sidebar polls this once a minute for every signed-in staff member, and each lookup
// calls the external SMS line, so the answer is shared for a short while.
const CACHE_MS = 30_000;
let cached: { at: number; items: Array<{ id: string; stamp: string }> } | null = null;

export async function GET() {
  if (!(await canAccessAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!cached || Date.now() - cached.at > CACHE_MS) {
    const queue = await getSmsGrievanceQueue();
    // The sample fallback shown during an outage isn't real work, so it isn't counted.
    cached = {
      at: Date.now(),
      items: queue.dataSource === "live"
        ? queue.records.filter((record) => smsAttention(record) !== null).map((record) => ({ id: record.id, stamp: smsAttentionStamp(record) }))
        : [],
    };
  }

  // Which of these this person has already opened is only known in their browser, so the
  // list goes down and the count is worked out there.
  return NextResponse.json({ items: cached.items }, { headers: { "Cache-Control": "private, no-store" } });
}
