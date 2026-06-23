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
      className={`gap-1.5 ${meta.color}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {meta.label}
    </Badge>
  );
});
