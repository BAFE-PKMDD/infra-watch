import { and, count, desc, eq, gt } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { chatHistory } from "@/lib/db/schema";
import { getChatHistoryVisibilityCondition } from "@/lib/chat-history-access";
import { parseChatHistoryQuery } from "@/lib/chat-history-query";
import { requireAdminOrModerator } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAdminOrModerator();

    const { page, limit, status, provider } = parseChatHistoryQuery(
      request.nextUrl.searchParams,
    );
    const filter = and(
      gt(chatHistory.expiresAt, new Date()),
      getChatHistoryVisibilityCondition({ role: user.role, userId: user.id }),
      status ? eq(chatHistory.status, status) : undefined,
      provider ? eq(chatHistory.provider, provider) : undefined,
    );

    const [records, [{ total }]] = await Promise.all([
      db
        .select()
        .from(chatHistory)
        .where(filter)
        .orderBy(desc(chatHistory.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ total: count() }).from(chatHistory).where(filter),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: records,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (message.startsWith("Forbidden")) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    console.error(
      "[Admin Chat History]",
      JSON.stringify({
        code: "query_failed",
        errorName: error instanceof Error ? error.name : "UnknownError",
      }),
    );
    return NextResponse.json(
      { error: "Chat history could not be loaded." },
      { status: 500 },
    );
  }
}
