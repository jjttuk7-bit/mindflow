"use client"

import { Composer } from "@/components/composer"
import { FeedList } from "@/components/feed-list"
import { TimelineView } from "@/components/timeline-view"
import { SortDropdown } from "@/components/sort-dropdown"
import { FeedSkeleton } from "@/components/feed-skeleton"
import { PullToRefresh } from "@/components/pull-to-refresh"
import { NudgeCards } from "@/components/nudge-card"
import { useStore } from "@/lib/store"
import { Archive, List, Clock } from "lucide-react"

interface MainFeedProps {
  onRefetch?: () => void
  onMenuClick?: () => void
  mobile?: boolean
  loading?: boolean
  loadMore?: () => void
  loadingMore?: boolean
  hasMore?: boolean
}

export function MainFeed({ onRefetch, onMenuClick, mobile, loading, loadMore, loadingMore, hasMore }: MainFeedProps) {
  const { showArchived, viewMode, setViewMode } = useStore()

  return (
    <main className={`flex-1 flex flex-col h-full overflow-hidden bg-background ${mobile ? "pb-16" : ""}`}>
      {/* Composer area (hidden in archive mode; hidden on mobile where FAB is used) */}
      {!showArchived && !mobile && (
        <>
          <div className="px-4 sm:px-6 md:px-8 pt-6 md:pt-8 pb-6">
            <div className="max-w-2xl mx-auto">
              <Composer onSaved={onRefetch} />
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent mx-4 sm:mx-6 md:mx-8" />
        </>
      )}

      {/* Archive header */}
      {showArchived && (
        <div className="px-4 sm:px-6 md:px-8 pt-6 md:pt-8 pb-4">
          <div className="max-w-2xl mx-auto flex items-center gap-2.5">
            <Archive className="h-5 w-5 text-muted-foreground/50" />
            <h2 className="font-display text-xl text-foreground/70">Archive</h2>
          </div>
        </div>
      )}

      {/* Sort bar + View toggle */}
      <div className="px-4 sm:px-6 md:px-8 py-2">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {/* View toggle */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/50">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                viewMode === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="List view"
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                viewMode === "timeline"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Timeline view"
            >
              <Clock className="h-3.5 w-3.5" />
              Timeline
            </button>
          </div>

          <SortDropdown />
        </div>
      </div>

      {/* Feed with pull-to-refresh on mobile */}
      <PullToRefresh
        onRefresh={async () => { onRefetch?.() }}
        className="flex-1 overflow-y-auto"
      >
        <div className="max-w-2xl mx-auto px-4 sm:px-6 md:px-8">
          <NudgeCards />
        </div>
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="px-6">
              <FeedSkeleton count={4} />
            </div>
          ) : viewMode === "timeline" ? (
            <TimelineView />
          ) : (
            <FeedList loadMore={loadMore} loadingMore={loadingMore} hasMore={hasMore} />
          )}
        </div>
      </PullToRefresh>
    </main>
  )
}
