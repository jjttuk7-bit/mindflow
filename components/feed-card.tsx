"use client"

import { useState, useEffect, useRef } from "react"
import { Item, LinkMeta, ImageMeta } from "@/lib/supabase/types"
import { Badge } from "@/components/ui/badge"
import { LinkCard } from "@/components/link-card"
import { ImageCard } from "@/components/image-card"
import { FileText, Link, Image, Mic, Trash2, ChevronDown, ChevronUp, Pin, Archive, ArchiveRestore, Pencil, Check, X } from "lucide-react"
import { ShareButton } from "@/components/share-button"

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
  onUpdate,
}: {
  item: Item
  onDelete: (id: string) => void
  onUpdate: (id: string, updates: Partial<Item>) => void
}) {
  const [hovered, setHovered] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(item.content)
  const [related, setRelated] = useState<RelatedItem[]>([])
  const [relatedLoaded, setRelatedLoaded] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
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

  // Auto-resize textarea and focus
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"
    }
  }, [editing])

  async function handlePin() {
    const newVal = !item.is_pinned
    onUpdate(item.id, { is_pinned: newVal })
    await fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_pinned: newVal }),
    })
  }

  async function handleArchive() {
    const newVal = !item.is_archived
    onUpdate(item.id, { is_archived: newVal })
    await fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_archived: newVal }),
    })
  }

  async function handleEditSave() {
    if (editContent.trim() === item.content) {
      setEditing(false)
      return
    }
    onUpdate(item.id, { content: editContent.trim() })
    setEditing(false)
    const res = await fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent.trim() }),
    })
    if (res.ok) {
      // Re-trigger AI tagging for updated content
      fetch("/api/ai/tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, content: editContent.trim() }),
      })
    }
  }

  function handleEditCancel() {
    setEditContent(item.content)
    setEditing(false)
  }

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

    // Editing mode
    if (editing) {
      return (
        <div className="space-y-2">
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => {
              setEditContent(e.target.value)
              e.target.style.height = "auto"
              e.target.style.height = e.target.scrollHeight + "px"
            }}
            className="w-full text-[15px] leading-relaxed bg-muted/30 border border-border/60 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleEditSave()
              if (e.key === "Escape") handleEditCancel()
            }}
          />
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleEditSave}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              <Check className="h-3 w-3" />
              Save
            </button>
            <button
              onClick={handleEditCancel}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-muted-foreground text-xs font-medium hover:bg-muted transition-colors"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
            <span className="text-[10px] text-muted-foreground/40 ml-auto">Ctrl+Enter to save</span>
          </div>
        </div>
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
      } ${item.is_pinned ? "ring-1 ring-primary/20" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Pin indicator */}
      {item.is_pinned && (
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
          <Pin className="h-2.5 w-2.5 text-primary fill-primary" />
        </div>
      )}

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

        {/* Action buttons */}
        <div className={`shrink-0 flex flex-col gap-0.5 transition-all duration-200 ${
          hovered ? "opacity-100" : "opacity-0"
        }`}>
          {item.type === "text" && !editing && (
            <button
              onClick={() => { setEditContent(item.content); setEditing(true) }}
              className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-primary/8 transition-all duration-200"
              aria-label="Edit item"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={handlePin}
            className={`h-7 w-7 flex items-center justify-center rounded-lg transition-all duration-200 ${
              item.is_pinned
                ? "text-primary bg-primary/8"
                : "text-muted-foreground/40 hover:text-primary hover:bg-primary/8"
            }`}
            aria-label={item.is_pinned ? "Unpin item" : "Pin item"}
          >
            <Pin className={`h-3 w-3 ${item.is_pinned ? "fill-primary" : ""}`} />
          </button>
          <ShareButton itemId={item.id} />
          <button
            onClick={handleArchive}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-amber-accent hover:bg-amber-accent/8 transition-all duration-200"
            aria-label={item.is_archived ? "Restore item" : "Archive item"}
          >
            {item.is_archived ? (
              <ArchiveRestore className="h-3 w-3" />
            ) : (
              <Archive className="h-3 w-3" />
            )}
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/8 transition-all duration-200"
            aria-label="Delete item"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </article>
  )
}
