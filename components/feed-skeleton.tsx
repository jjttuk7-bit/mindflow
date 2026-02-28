export function FeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3 py-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/40 bg-card px-5 py-4 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-lg bg-muted shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="flex gap-2">
                <div className="h-5 bg-muted rounded-md w-16" />
                <div className="h-5 bg-muted rounded-md w-12" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
