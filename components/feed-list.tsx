"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useStore } from "@/lib/store"
import { FeedCard } from "@/components/feed-card"
import { SwipeableCard } from "@/components/swipeable-card"
import { CardContextMenu } from "@/components/card-context-menu"
import { Item } from "@/lib/supabase/types"
import { DailyBriefing } from "@/components/daily-briefing"
import { ResurfacedMemory } from "@/components/resurfaced-memory"
import { Sparkles, Pin } from "lucide-react"
import { toast } from "sonner"

export function FeedList({ loadMore, loadingMore, hasMore }: { loadMore?: () => void; loadingMore?: boolean; hasMore?: boolean }) {
  const { items, activeFilter, activeTag, showArchived, showTrash, sortBy, removeItem, updateItem, addItem, activeProject, smartFolder, searchQuery } = useStore()
  const [contextItem, setContextItem] = useState<Item | null>(null)
  const [swipeHintSeen, setSwipeHintSeen] = useState(true)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSwipeHintSeen(!!localStorage.getItem("swipe-hint-seen"))
  }, [])

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

  const { pinned, unpinned } = useMemo(() => {
    const baseFiltered = items.filter((item) => {
      if (showTrash) return !!item.deleted_at
      if (item.deleted_at) return false
      if (showArchived) return !!item.is_archived
      if (item.is_archived) return false
      if (activeFilter !== "all" && item.type !== activeFilter) return false
      if (activeTag && !item.tags?.some((t) => t.name === activeTag)) return false
      if (activeProject && item.project_id !== activeProject) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchContent = item.content.toLowerCase().includes(q)
        const matchSummary = item.summary?.toLowerCase().includes(q)
        const matchTag = item.tags?.some((t) => t.name.toLowerCase().includes(q))
        if (!matchContent && !matchSummary && !matchTag) return false
      }
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

    const sorted = [...baseFiltered].sort((a, b) => {
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sortBy === "type") return a.type.localeCompare(b.type)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return {
      pinned: (showArchived || showTrash) ? [] : sorted.filter((i) => i.is_pinned),
      unpinned: (showArchived || showTrash) ? sorted : sorted.filter((i) => !i.is_pinned),
    }
  }, [items, showTrash, showArchived, activeFilter, activeTag, activeProject, searchQuery, smartFolder, sortBy])

  async function handleDelete(id: string) {
    const prev = items.find((i) => i.id === id)
    if (showTrash) {
      // In trash view, delete permanently
      removeItem(id)
      toast.success("영구 삭제됨")
      try {
        const res = await fetch(`/api/items/${id}?permanent=true`, { method: "DELETE" })
        if (!res.ok) throw new Error()
      } catch {
        if (prev) addItem(prev)
        toast.error("삭제에 실패했습니다")
      }
      return
    }
    // Soft delete: move to trash
    const now = new Date().toISOString()
    updateItem(id, { deleted_at: now })
    toast.success("휴지통으로 이동", {
      action: {
        label: "되돌리기",
        onClick: () => handleRestore(id),
      },
    })
    try {
      const res = await fetch(`/api/items/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
    } catch {
      updateItem(id, { deleted_at: null })
      toast.error("삭제에 실패했습니다")
    }
  }

  async function handleRestore(id: string) {
    updateItem(id, { deleted_at: null })
    toast.success("복원됨")
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleted_at: null }),
      })
      if (!res.ok) throw new Error()
    } catch {
      updateItem(id, { deleted_at: new Date().toISOString() })
      toast.error("복원에 실패했습니다")
    }
  }

  function handleUpdate(id: string, updates: Partial<Item>) {
    updateItem(id, updates)
  }

  async function handleSwipeArchive(item: Item) {
    if (!swipeHintSeen) { localStorage.setItem("swipe-hint-seen", "1"); setSwipeHintSeen(true) }
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
    if (!swipeHintSeen) { localStorage.setItem("swipe-hint-seen", "1"); setSwipeHintSeen(true) }
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
            {showTrash ? "휴지통이 비었어요" : showArchived ? "보관된 기록이 없어요" : "생각의 흐름을 시작하세요"}
          </p>
          <p className="text-sm text-muted-foreground/50 max-w-[260px]">
            {showTrash
              ? "삭제된 항목이 여기에 표시됩니다."
              : showArchived
              ? "보관된 항목이 여기에 표시됩니다."
              : "아이디어, 링크, 영감을 기록하세요. AI가 자동으로 정리해드려요."}
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
            <span className="text-ui-xs tracking-[0.15em] uppercase font-semibold text-primary/50">
              고정됨
            </span>
          </div>
          {pinned.map((item) => (
            <SwipeableCard key={item.id} onSwipeLeft={() => handleSwipeArchive(item)} onSwipeRight={() => handleSwipePin(item)} onLongPress={() => setContextItem(item)}>
              <FeedCard item={item} onDelete={handleDelete} onUpdate={handleUpdate} onRestore={handleRestore} showTrash={showTrash} />
            </SwipeableCard>
          ))}
          <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent my-2" />
        </>
      )}

      {/* Daily briefing & resurfaced memory - only on default feed */}
      {!showArchived && !showTrash && !activeProject && !smartFolder && !searchQuery && (
        <>
          <DailyBriefing />
          <ResurfacedMemory />
        </>
      )}

      {/* Regular items */}
      {unpinned.map((item, index) => (
        <div key={item.id}>
          <SwipeableCard onSwipeLeft={showTrash ? () => {} : () => handleSwipeArchive(item)} onSwipeRight={showTrash ? () => {} : () => handleSwipePin(item)} onLongPress={() => setContextItem(item)}>
            <FeedCard item={item} onDelete={handleDelete} onUpdate={handleUpdate} onRestore={handleRestore} showTrash={showTrash} />
          </SwipeableCard>
          {index === 0 && !swipeHintSeen && (
            <p className="text-xs text-muted-foreground/50 text-center py-1 md:hidden">
              ← 고정 | 보관 →
            </p>
          )}
        </div>
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
        <p className="text-center text-xs text-muted-foreground/40 py-4">모든 항목을 확인했어요</p>
      )}

      {/* Long-press context menu */}
      <CardContextMenu
        item={contextItem}
        onClose={() => setContextItem(null)}
        onPin={handleSwipePin}
        onArchive={handleSwipeArchive}
        onDelete={handleDelete}
        onRestore={handleRestore}
        showTrash={showTrash}
      />
    </div>
  )
}
