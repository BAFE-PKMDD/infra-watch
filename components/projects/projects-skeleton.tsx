import { Skeleton } from "@/components/ui/skeleton"
import type { ViewMode } from "@/types";

interface ProjectsSkeletonProps {
  viewMode?: ViewMode;
}

export function ProjectsSkeleton({ viewMode = "grid" }: ProjectsSkeletonProps) {
  if (viewMode === "table") {
    return <ProjectsTableSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-6 animate-in fade-in duration-500">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm dark:bg-slate-900 dark:border-slate-800 h-[380px]">
          <Skeleton className="h-48 w-full rounded-none" />
          <div className="p-5 space-y-4">
            <div className="flex justify-between items-start">
              <Skeleton className="h-6 w-3/4 rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/2 rounded-md" />
              <Skeleton className="h-4 w-2/3 rounded-md" />
            </div>
            <div className="pt-4 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-4 w-16 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProjectsTableSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm my-6">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <th key={i} className="px-6 py-4"><Skeleton className="h-4 w-20" /></th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                {[1, 2, 3, 4, 5, 6].map((j) => (
                  <td key={j} className="px-6 py-4"><Skeleton className="h-4 w-full" /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
