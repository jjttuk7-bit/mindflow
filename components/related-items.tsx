"use client"

import { useState, useEffect } from "react"
import { Link2, FileText, Image, Mic, Sparkles } from "lucide-react"

const typeIcons: Record<string, React.ReactNode> = {
  text: <FileText className="h-3 w-3" />,
  link: <Link2 className="h-3 w-3" />,
  image: <Image className="h-3 w-3" />,
  voice: <Mic className="h-3 w-3" />,
}

interface RelatedItem {
  id: string
  content: string
  summary?: string | null
  type: string
  similarity: number
  created_at: string
}

export function RelatedItems({ itemId, onItemClick }: {
  itemId: string
  onItemClick?: (id: string) => void
}) {
  const [items, setItems] = useState<RelatedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/items/${itemId}/connections`)
      .then((r) => r.json())
      .then((data) => setItems(data.connections || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [itemId])

  if (loading || items.length === 0) return null

  return (
    <div className="mt-3 pt-3 border-t border-border/40">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="h-3 w-3 text-primary" />
        <span className="text-xs font-medium text-muted-foreground">관련 항목</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {items.slice(0, 3).map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick?.(item.id)}
            className="flex items-center gap-2 text-left text-xs text-muted-foreground hover:text-foreground rounded-lg px-2 py-1.5 hover:bg-accent/40 transition-colors"
          >
            {typeIcons[item.type]}
            <span className="truncate">
              {item.summary || item.content?.slice(0, 60)}
            </span>
            <span className="ml-auto text-ui-xs text-muted-foreground/60 shrink-0">
              {Math.round(item.similarity * 100)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
