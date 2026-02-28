"use client"

import { useStore } from "@/lib/store"
import { FeedCard } from "@/components/feed-card"
import { Item } from "@/lib/supabase/types"
import { Sparkles } from "lucide-react"

function formatDateHeading(dateStr: string): string {
  const date = new Date(dateStr)
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }
  const formatted = date.toLocaleDateString("en-US", options)
  // "Thursday, February 28, 2026" -> "February 28, 2026 · Thursday"
  const parts = formatted.split(", ")
  if (parts.length === 3) {
    return `${parts[1]}, ${parts[2]} \u00b7 ${parts[0]}`
  }
  return formatted
}

function groupByDate(items: Item[]): Map<string, Item[]> {
  const groups = new Map<string, Item[]>()
  for (const item of items) {
    const dateKey = new Date(item.created_at).toLocaleDateString("en-CA") // YYYY-MM-DD
    if (!groups.has(dateKey)) {
      groups.set(dateKey, [])
    }
    groups.get(dateKey)!.push(item)
  }
  return groups
}

export function TimelineView() {
  const {
    items,
    activeFilter,
    activeTag,
    showArchived,
    sortBy,
    removeItem,
    updateItem,
    activeProject,
    smartFolder,
    searchQuery,
  } = useStore()

  // Apply same filtering logic as feed-list.tsx
  const baseFiltered = items.filter((item) => {
    // Archive filter
    if (showArchived) return !!item.is_archived
    if (item.is_archived) return false
    // Type filter
    if (activeFilter !== "all" && item.type !== activeFilter) return false
    // Tag filter
    if (activeTag && !item.tags?.some((t) => t.name === activeTag)) return false
    // Project filter
    if (activeProject && item.project_id !== activeProject) return false
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchContent = item.content.toLowerCase().includes(q)
      const matchSummary = item.summary?.toLowerCase().includes(q)
      const matchTag = item.tags?.some((t) => t.name.toLowerCase().includes(q))
      if (!matchContent && !matchSummary && !matchTag) return false
    }
    // Smart folder filter
    if (smartFolder === "this-week") {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      if (new Date(item.created_at) < weekAgo) return false
    }
    if (smartFolder === "pinned") {
      if (!item.is_pinned) return false
    }
    return true
  })

  // Sort — timeline always uses newest first for grouping to make sense
  const sorted = [...baseFiltered].sort((a, b) => {
    if (sortBy === "oldest")
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    if (sortBy === "type") return a.type.localeCompare(b.type)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  async function handleDelete(id: string) {
    await fetch(`/api/items/${id}`, { method: "DELETE" })
    removeItem(id)
  }

  function handleUpdate(id: string, updates: Partial<Item>) {
    updateItem(id, updates)
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-muted-foreground/40" />
        </div>
        <div className="text-center space-y-1.5">
          <p className="font-display text-lg text-foreground/60">
            {showArchived ? "No archived thoughts" : "No items to display"}
          </p>
          <p className="text-sm text-muted-foreground/50 max-w-[260px]">
            {showArchived
              ? "Archived items will appear here."
              : "Capture ideas, links, and inspirations. They'll appear on your timeline."}
          </p>
        </div>
      </div>
    )
  }

  const dateGroups = groupByDate(sorted)

  return (
    <div className="p-4 sm:p-6 space-y-8">
      {Array.from(dateGroups.entries()).map(([dateKey, dateItems]) => (
        <div key={dateKey}>
          {/* Sticky date header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <h3 className="text-sm font-semibold text-muted-foreground px-2 py-3">
              {formatDateHeading(dateKey)}
            </h3>
            <div className="h-px bg-border/40" />
          </div>

          {/* Timeline items */}
          <div className="space-y-3 mt-3">
            {dateItems.map((item, idx) => (
              <div key={item.id} className="flex gap-3">
                {/* Timeline connector */}
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  {idx < dateItems.length - 1 && (
                    <div className="w-px flex-1 bg-border/40" />
                  )}
                </div>

                {/* Item content */}
                <div className="flex-1 pb-4 min-w-0">
                  {/* Context badges */}
                  {item.context && (
                    <div className="flex gap-1.5 mb-1.5">
                      {item.context.time_of_day && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {item.context.time_of_day}
                        </span>
                      )}
                      {item.context.source && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {item.context.source}
                        </span>
                      )}
                      {item.context.topic_cluster && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {item.context.topic_cluster}
                        </span>
                      )}
                    </div>
                  )}
                  {/* Source badge (fallback when no context) */}
                  {!item.context && item.source && (
                    <div className="flex gap-1.5 mb-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {item.source}
                      </span>
                    </div>
                  )}
                  <FeedCard
                    item={item}
                    onDelete={handleDelete}
                    onUpdate={handleUpdate}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
