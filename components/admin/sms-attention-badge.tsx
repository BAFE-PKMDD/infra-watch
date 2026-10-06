"use client";

import { useQuery } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { useSmsSeen } from "@/lib/sms-grievance/seen-store";

// How many SMS messages are waiting on staff and haven't been opened in this browser (see
// lib/sms-grievance/attention.ts). Polled slowly: a minute's delay is fine for an
// indicator, and every poll reaches the SMS line.
export function useSmsAttentionCount(enabled = true) {
  const seen = useSmsSeen();
  const { data } = useQuery({
    queryKey: ["sms-grievance-attention"],
    queryFn: async () => {
      const response = await fetch("/api/admin/sms-grievance/attention", { cache: "no-store" });
      if (!response.ok) return [];
      const body = (await response.json()) as { items?: Array<{ id: string; stamp: string }> };
      return Array.isArray(body.items) ? body.items : [];
    },
    enabled,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  return (data ?? []).filter((item) => {
    const seenAt = seen[item.id];
    return !seenAt || new Date(item.stamp).getTime() > new Date(seenAt).getTime();
  }).length;
}

export function SmsAttentionBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      role="status"
      aria-label={`${count} SMS ${count === 1 ? "message needs" : "messages need"} attention`}
      className={cn("inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold leading-5 text-white", className)}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
