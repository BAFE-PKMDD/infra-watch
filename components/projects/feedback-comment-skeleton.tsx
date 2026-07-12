export function FeedbackCommentSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 p-3 animate-pulse"
        >
          {/* Header */}
          <div className="flex items-start gap-2 mb-2">
            {/* Avatar Skeleton */}
            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />

            <div className="flex-1 min-w-0">
              {/* Name and Date Skeleton */}
              <div className="flex items-center gap-1.5 mb-1">
                <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-2 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>

              {/* Comment Text Skeleton */}
              <div className="space-y-1">
                <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-2.5 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>

              {/* Voting Skeleton */}
              <div className="flex items-center gap-3 mt-2 pt-1.5 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-0.5">
                  <div className="w-2.5 h-2.5 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-2 w-4 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
                <div className="flex items-center gap-0.5">
                  <div className="w-2.5 h-2.5 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-2 w-4 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
