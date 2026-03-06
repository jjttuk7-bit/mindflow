"use client"

import { Composer } from "@/components/composer"
import { FeedList } from "@/components/feed-list"
import { TimelineView } from "@/components/timeline-view"
import { SortDropdown } from "@/components/sort-dropdown"
import { FeedSkeleton } from "@/components/feed-skeleton"
import { PullToRefresh } from "@/components/pull-to-refresh"
import { NudgeCards } from "@/components/nudge-card"
import { useStore } from "@/lib/store"
import { Archive, List, Clock, Trash2, Search } from "lucide-react"
import { toast } from "sonner"

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
  const { showArchived, showTrash, items, removeItem, viewMode, setViewMode } = useStore()

  async function handleEmptyTrash() {
    const trashedItems = items.filter((i) => !!i.deleted_at)
    if (trashedItems.length === 0) return
    const confirmed = window.confirm(`휴지통의 ${trashedItems.length}개 항목을 영구 삭제하시겠습니까?`)
    if (!confirmed) return
    for (const item of trashedItems) {
      removeItem(item.id)
      fetch(`/api/items/${item.id}?permanent=true`, { method: "DELETE" }).catch(() => {})
    }
    toast.success(`${trashedItems.length}개 항목 영구 삭제됨`)
  }

  return (
    <main className={`flex-1 flex flex-col h-full overflow-hidden bg-background ${mobile ? "pb-16" : ""}`}>
      {/* Composer area (hidden in archive/trash mode; hidden on mobile where FAB is used) */}
      {!showArchived && !showTrash && !mobile && (
        <>
          <div className="px-4 sm:px-6 md:px-8 pt-6 md:pt-8 pb-6">
            <div className="max-w-2xl mx-auto space-y-4">
              {/* Search bar trigger */}
              <button
                onClick={() => {
                  document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }))
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border/40 bg-muted/30 hover:bg-muted/60 hover:border-border transition-all duration-200 group"
              >
                <Search className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground/60" />
                <span className="text-sm text-muted-foreground/40 group-hover:text-muted-foreground/60">
                  무엇이든 검색하세요...
                </span>
                <kbd className="ml-auto hidden sm:inline-flex px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground/40">
                  Ctrl+K
                </kbd>
              </button>
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

      {/* Trash header */}
      {showTrash && (
        <div className="px-4 sm:px-6 md:px-8 pt-6 md:pt-8 pb-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Trash2 className="h-5 w-5 text-destructive/50" />
              <h2 className="font-display text-xl text-foreground/70">Trash</h2>
            </div>
            <button
              onClick={handleEmptyTrash}
              className="text-xs text-destructive/70 hover:text-destructive px-3 py-1.5 rounded-lg hover:bg-destructive/5 transition-colors font-medium"
            >
              휴지통 비우기
            </button>
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
