export function FeedbackSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 animate-pulse"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              {/* Avatar Skeleton */}
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />

              <div>
                {/* Name Skeleton */}
                <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-1" />
                {/* Date Skeleton */}
                <div className="h-2 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            </div>

            {/* Category Badge Skeleton */}
            <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
          </div>

          {/* Rating Skeleton */}
          <div className="flex items-center gap-0.5 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <div key={star} className="w-3.5 h-3.5 bg-slate-200 dark:bg-slate-700 rounded" />
            ))}
          </div>

          {/* Comment Text Skeleton */}
          <div className="space-y-1 mb-2">
            <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-2.5 w-5/6 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-2.5 w-4/6 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>

          {/* Voting Skeleton */}
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1">
              <div className="w-3.5 h-3.5 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-2 w-4 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3.5 h-3.5 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-2 w-4 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          </div>

          {/* Comments Button Skeleton */}
          <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
            <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
