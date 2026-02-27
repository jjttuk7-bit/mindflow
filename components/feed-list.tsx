"use client"

import { useStore } from "@/lib/store"
import { FeedCard } from "@/components/feed-card"
import { Sparkles } from "lucide-react"

export function FeedList() {
  const { items, activeFilter, activeTag, removeItem } = useStore()

  const filtered = items.filter((item) => {
    if (activeFilter !== "all" && item.type !== activeFilter) return false
    if (activeTag && !item.tags?.some((t) => t.name === activeTag)) return false
    return true
  })

  async function handleDelete(id: string) {
    await fetch(`/api/items/${id}`, { method: "DELETE" })
    removeItem(id)
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-muted-foreground/40" />
        </div>
        <div className="text-center space-y-1.5">
          <p className="font-display text-lg text-foreground/60">
            Begin your stream of thought
          </p>
          <p className="text-sm text-muted-foreground/50 max-w-[260px]">
            Capture ideas, links, and inspirations. AI will organize them for you.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-3">
      {filtered.map((item) => (
        <FeedCard key={item.id} item={item} onDelete={handleDelete} />
      ))}
    </div>
  )
}
