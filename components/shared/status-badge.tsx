import { Badge } from "@/components/ui/badge";
import { statusConfig } from "@/lib/status-config";
import { memo } from "react";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge = memo(function StatusBadge({ status }: StatusBadgeProps) {
  const meta = statusConfig[status] ?? statusConfig.planned;
  const Icon = meta.icon;

  return (
    <Badge
      variant="outline"
      className="gap-1.5 border border-slate-700/50 bg-[#0a0f1a] text-[11px] font-medium text-slate-300 rounded-full px-2.5 py-0.5 hover:bg-[#0a0f1a]"
    >
      <Icon className="w-3.5 h-3.5" />
      {meta.label}
    </Badge>
  );
});
