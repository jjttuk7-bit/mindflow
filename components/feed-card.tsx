"use client"

import { useState, useEffect } from "react"
import { Item, LinkMeta, ImageMeta } from "@/lib/supabase/types"
import { Badge } from "@/components/ui/badge"
import { LinkCard } from "@/components/link-card"
import { ImageCard } from "@/components/image-card"
import { FileText, Link, Image, Mic, Trash2, ChevronDown, ChevronUp } from "lucide-react"

const typeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  text: {
    icon: <FileText className="h-3.5 w-3.5" />,
    color: "text-terracotta bg-terracotta/8",
    label: "Idea",
  },
  link: {
    icon: <Link className="h-3.5 w-3.5" />,
    color: "text-sage bg-sage/10",
    label: "Link",
  },
  image: {
    icon: <Image className="h-3.5 w-3.5" />,
    color: "text-dusty-rose bg-dusty-rose/10",
    label: "Image",
  },
  voice: {
    icon: <Mic className="h-3.5 w-3.5" />,
    color: "text-amber-accent bg-amber-accent/10",
    label: "Voice",
  },
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

function isLinkMeta(meta: unknown): meta is LinkMeta {
  return !!meta && typeof meta === "object" && "og_url" in meta
}

function isImageMeta(meta: unknown): meta is ImageMeta {
  return !!meta && typeof meta === "object" && "image_url" in meta
}

interface RelatedItem {
  id: string
  content: string
  summary?: string
  type: string
  similarity: number
}

export function FeedCard({
  item,
  onDelete,
}: {
  item: Item
  onDelete: (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [related, setRelated] = useState<RelatedItem[]>([])
  const [relatedLoaded, setRelatedLoaded] = useState(false)
  const config = typeConfig[item.type] ?? typeConfig.text
  const meta = item.metadata

  const hasSummary = item.summary && item.content.length > 100
  const displayText = hasSummary && !expanded ? item.summary : item.content

  // Fetch related items on first hover
  useEffect(() => {
    if (!hovered || relatedLoaded) return
    setRelatedLoaded(true)
    fetch(`/api/items/${item.id}/related`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setRelated(data))
      .catch(() => {})
  }, [hovered, relatedLoaded, item.id])

  const renderContent = () => {
    if (item.type === "link" && isLinkMeta(meta)) {
      return <LinkCard url={item.content} meta={meta} />
    }

    if (item.type === "image" && isImageMeta(meta)) {
      return (
        <ImageCard
          imageUrl={meta.image_url}
          caption={item.content !== "Image" ? item.content : undefined}
        />
      )
    }

    // Default: text content (with optional summary)
    return (
      <div>
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words text-foreground/90">
          {displayText}
        </p>
        {hasSummary && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-1.5 text-[11px] text-primary/60 hover:text-primary transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" />
                Show summary
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                Show full text
              </>
            )}
          </button>
        )}
      </div>
    )
  }

  return (
    <article
      className={`group relative rounded-xl border bg-card px-5 py-4 transition-all duration-300 ${
        hovered
          ? "shadow-[0_2px_16px_-4px_oklch(0.5_0.05_55/0.08)] border-border"
          : "border-border/40 shadow-none"
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-start gap-4">
        {/* Type indicator */}
        <div className={`mt-0.5 flex items-center justify-center w-8 h-8 rounded-lg ${config.color} shrink-0`}>
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2.5">
          {renderContent()}

          {/* Tags + Meta */}
          <div className="flex items-center gap-2 flex-wrap">
            {item.tags && item.tags.length > 0 ? (
              item.tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="text-[10px] tracking-wide px-2 py-0.5 rounded-md font-medium bg-muted/70 text-muted-foreground border-0 hover:bg-muted"
                >
                  {tag.name}
                </Badge>
              ))
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/50 italic">
                <span className="h-1 w-1 rounded-full bg-amber-accent animate-pulse" />
                Analyzing
              </span>
            )}
            <span className="text-[11px] text-muted-foreground/40 ml-auto tabular-nums">
              {timeAgo(item.created_at)}
            </span>
          </div>

          {/* Related items */}
          {related.length > 0 && (
            <div className="pt-2 border-t border-border/30">
              <p className="text-[10px] tracking-[0.15em] uppercase font-semibold text-muted-foreground/40 mb-1.5">
                Related
              </p>
              <div className="flex flex-wrap gap-1.5">
                {related.map((r) => (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/40 text-[11px] text-muted-foreground/70 hover:bg-muted/70 transition-colors cursor-default"
                  >
                    {typeConfig[r.type]?.icon}
                    <span className="truncate max-w-[180px]">
                      {r.summary || r.content}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={() => onDelete(item.id)}
          className={`shrink-0 h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/8 transition-all duration-200 ${
            hovered ? "opacity-100" : "opacity-0"
          }`}
          aria-label="Delete item"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  )
}
