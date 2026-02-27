"use client"

import { useStore } from "@/lib/store"
import { FeedCard } from "@/components/feed-card"
import { Item } from "@/lib/supabase/types"
import { Sparkles, Pin } from "lucide-react"

export function FeedList() {
  const { items, activeFilter, activeTag, showArchived, sortBy, removeItem, updateItem } = useStore()

  const baseFiltered = items.filter((item) => {
    // Archive filter
    if (showArchived) return !!item.is_archived
    if (item.is_archived) return false
    // Type filter
    if (activeFilter !== "all" && item.type !== activeFilter) return false
    // Tag filter
    if (activeTag && !item.tags?.some((t) => t.name === activeTag)) return false
    return true
  })

  // Sort
  const sorted = [...baseFiltered].sort((a, b) => {
    if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    if (sortBy === "type") return a.type.localeCompare(b.type)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  // Separate pinned and unpinned (only when not in archive mode)
  const pinned = showArchived ? [] : sorted.filter((i) => i.is_pinned)
  const unpinned = showArchived ? sorted : sorted.filter((i) => !i.is_pinned)

  async function handleDelete(id: string) {
    await fetch(`/api/items/${id}`, { method: "DELETE" })
    removeItem(id)
  }

  function handleUpdate(id: string, updates: Partial<Item>) {
    updateItem(id, updates)
  }

  if (pinned.length === 0 && unpinned.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-muted-foreground/40" />
        </div>
        <div className="text-center space-y-1.5">
          <p className="font-display text-lg text-foreground/60">
            {showArchived ? "No archived thoughts" : "Begin your stream of thought"}
          </p>
          <p className="text-sm text-muted-foreground/50 max-w-[260px]">
            {showArchived
              ? "Archived items will appear here."
              : "Capture ideas, links, and inspirations. AI will organize them for you."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-3">
      {/* Pinned section */}
      {pinned.length > 0 && (
        <>
          <div className="flex items-center gap-2 px-1 mb-1">
            <Pin className="h-3 w-3 text-primary/50 fill-primary/50" />
            <span className="text-[10px] tracking-[0.15em] uppercase font-semibold text-primary/50">
              Pinned
            </span>
          </div>
          {pinned.map((item) => (
            <FeedCard key={item.id} item={item} onDelete={handleDelete} onUpdate={handleUpdate} />
          ))}
          <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent my-2" />
        </>
      )}

      {/* Regular items */}
      {unpinned.map((item) => (
        <FeedCard key={item.id} item={item} onDelete={handleDelete} onUpdate={handleUpdate} />
      ))}
    </div>
  )
}
