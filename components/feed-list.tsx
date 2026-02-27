"use client"

import { useStore } from "@/lib/store"
import { FeedCard } from "@/components/feed-card"

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
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No items yet. Start capturing your thoughts!
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
