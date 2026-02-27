"use client"

import { useState } from "react"
import { Item } from "@/lib/supabase/types"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Link, Image, Mic, Trash2 } from "lucide-react"

const typeIcons: Record<string, React.ReactNode> = {
  text: <FileText className="h-4 w-4 text-blue-500" />,
  link: <Link className="h-4 w-4 text-green-500" />,
  image: <Image className="h-4 w-4 text-purple-500" />,
  voice: <Mic className="h-4 w-4 text-orange-500" />,
}

function timeAgo(dateStr: string) {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  )
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function FeedCard({
  item,
  onDelete,
}: {
  item: Item
  onDelete: (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <Card
      className="p-4 hover:bg-muted/50 transition-colors"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{typeIcons[item.type]}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm whitespace-pre-wrap break-words">
            {item.content}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {item.tags && item.tags.length > 0 ? (
              item.tags.map((tag) => (
                <Badge key={tag.id} variant="secondary" className="text-xs">
                  #{tag.name}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground italic">
                Analyzing...
              </span>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {timeAgo(item.created_at)}
            </span>
          </div>
        </div>
        {hovered && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </Card>
  )
}
