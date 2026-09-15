import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  columnCount?: number;
  rowCount?: number;
}

export function TableSkeleton({ columnCount = 5, rowCount = 5 }: TableSkeletonProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="p-6 space-y-4">
        {Array.from({ length: rowCount }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-4">
            {Array.from({ length: columnCount }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-8 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
