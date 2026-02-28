"use client"

import { useState, useEffect, useRef } from "react"
import { useStore } from "@/lib/store"
import { FeedCard } from "@/components/feed-card"
import { SwipeableCard } from "@/components/swipeable-card"
import { CardContextMenu } from "@/components/card-context-menu"
import { Item } from "@/lib/supabase/types"
import { Sparkles, Pin } from "lucide-react"
import { toast } from "sonner"

export function FeedList({ loadMore, loadingMore, hasMore }: { loadMore?: () => void; loadingMore?: boolean; hasMore?: boolean }) {
  const { items, activeFilter, activeTag, showArchived, sortBy, removeItem, updateItem, addItem, activeProject, smartFolder, searchQuery } = useStore()
  const [contextItem, setContextItem] = useState<Item | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMore || !sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { rootMargin: "200px" }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [loadMore])

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
    const prev = items.find((i) => i.id === id)
    removeItem(id)
    toast.success("Deleted")
    try {
      const res = await fetch(`/api/items/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
    } catch {
      if (prev) addItem(prev)
      toast.error("Failed to delete")
    }
  }

  function handleUpdate(id: string, updates: Partial<Item>) {
    updateItem(id, updates)
  }

  async function handleSwipeArchive(item: Item) {
    updateItem(item.id, { is_archived: true })
    toast.success("Archived")
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: true }),
      })
      if (!res.ok) throw new Error()
    } catch {
      updateItem(item.id, { is_archived: false })
      toast.error("Failed to archive")
    }
  }

  async function handleSwipePin(item: Item) {
    const newVal = !item.is_pinned
    updateItem(item.id, { is_pinned: newVal })
    toast.success(newVal ? "Pinned" : "Unpinned")
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_pinned: newVal }),
      })
      if (!res.ok) throw new Error()
    } catch {
      updateItem(item.id, { is_pinned: !newVal })
      toast.error("Failed to update")
    }
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
            <SwipeableCard key={item.id} onSwipeLeft={() => handleSwipeArchive(item)} onSwipeRight={() => handleSwipePin(item)} onLongPress={() => setContextItem(item)}>
              <FeedCard item={item} onDelete={handleDelete} onUpdate={handleUpdate} />
            </SwipeableCard>
          ))}
          <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent my-2" />
        </>
      )}

      {/* Regular items */}
      {unpinned.map((item) => (
        <SwipeableCard key={item.id} onSwipeLeft={() => handleSwipeArchive(item)} onSwipeRight={() => handleSwipePin(item)} onLongPress={() => setContextItem(item)}>
          <FeedCard item={item} onDelete={handleDelete} onUpdate={handleUpdate} />
        </SwipeableCard>
      ))}

      {/* Infinite scroll sentinel */}
      {hasMore !== false && (
        <div ref={sentinelRef} className="flex items-center justify-center py-4">
          {loadingMore && (
            <span className="h-5 w-5 rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground/60 animate-spin" />
          )}
        </div>
      )}
      {hasMore === false && unpinned.length > 0 && (
        <p className="text-center text-xs text-muted-foreground/40 py-4">You've seen it all</p>
      )}

      {/* Long-press context menu */}
      <CardContextMenu
        item={contextItem}
        onClose={() => setContextItem(null)}
        onPin={handleSwipePin}
        onArchive={handleSwipeArchive}
        onDelete={handleDelete}
      />
    </div>
  )
}
