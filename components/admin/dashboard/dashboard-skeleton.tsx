import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading infrastructure monitoring" className="space-y-6">
      <Skeleton className="h-12 w-full rounded-md" />
      <Skeleton className="h-14 w-full rounded-md" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-md" />
        ))}
      </div>
      <Skeleton className="h-44 w-full rounded-md" />
      <Skeleton className="h-72 w-full rounded-md" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-md" />
        <Skeleton className="h-72 rounded-md" />
      </div>
    </div>
  );
}
