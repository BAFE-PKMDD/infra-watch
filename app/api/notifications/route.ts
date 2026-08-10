import { NextResponse } from "next/server";
import { getNotificationClientCount, getRecentNotifications } from "@/lib/realtime-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: getRecentNotifications(),
    connectedClients: getNotificationClientCount(),
  });
}
