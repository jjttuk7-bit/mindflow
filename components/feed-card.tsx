"use client"

import { useState, useEffect, useRef } from "react"
import { Item, LinkMeta, ImageMeta, ItemContext } from "@/lib/supabase/types"
import { Badge } from "@/components/ui/badge"
import { LinkCard } from "@/components/link-card"
import { ImageCard } from "@/components/image-card"
import { FileText, Link, Image, Mic, Trash2, ChevronDown, ChevronUp, Pin, Archive, ArchiveRestore, Pencil, Check, X, FolderOpen, Sparkles } from "lucide-react"
import { ShareButton } from "@/components/share-button"
import { VoiceCard } from "@/components/voice-card"
import { VoiceMeta } from "@/lib/supabase/types"
import { useStore } from "@/lib/store"
import { toast } from "sonner"

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
  const date = new Date(dateStr)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "방금"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  // Show actual date for older items
  const now = new Date()
  const sameYear = date.getFullYear() === now.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  if (sameYear) return `${month}월 ${day}일`
  return `${date.getFullYear()}.${month}.${day}`
}

function isLinkMeta(meta: unknown): meta is LinkMeta {
  return !!meta && typeof meta === "object" && "og_url" in meta
}

function isImageMeta(meta: unknown): meta is ImageMeta {
  return !!meta && typeof meta === "object" && "image_url" in meta
}

function isVoiceMeta(meta: unknown): meta is VoiceMeta {
  return !!meta && typeof meta === "object" && "file_url" in meta
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
  const [showProjectMenu, setShowProjectMenu] = useState(false)
  const projectMenuRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { projects } = useStore()
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
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_pinned: newVal }),
      })
      if (!res.ok) throw new Error()
    } catch {
      onUpdate(item.id, { is_pinned: !newVal })
      toast.error("Failed to update pin")
    }
  }

  async function handleArchive() {
    const newVal = !item.is_archived
    onUpdate(item.id, { is_archived: newVal })
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: newVal }),
      })
      if (!res.ok) throw new Error()
    } catch {
      onUpdate(item.id, { is_archived: !newVal })
      toast.error("Failed to update archive")
    }
  }

  async function handleEditSave() {
    if (editContent.trim() === item.content) {
      setEditing(false)
      return
    }
    const prevContent = item.content
    onUpdate(item.id, { content: editContent.trim() })
    setEditing(false)
    try {
      const patchBody: Record<string, unknown> = { content: editContent.trim() }
      // For voice, also update transcript in metadata
      if (item.type === "voice" && isVoiceMeta(item.metadata)) {
        patchBody.metadata = { ...item.metadata, transcript: editContent.trim() }
      }
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      })
      if (!res.ok) throw new Error()
      // Re-trigger AI tagging for updated content
      fetch("/api/ai/tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: item.id, content: editContent.trim(), type: item.type }),
      }).catch(() => {})
    } catch {
      onUpdate(item.id, { content: prevContent })
      setEditContent(prevContent)
      toast.error("Failed to save edit")
    }
  }

  function handleEditCancel() {
    setEditContent(item.content)
    setEditing(false)
  }

  // Close project menu on click outside
  useEffect(() => {
    if (!showProjectMenu) return
    function handleClick(e: MouseEvent) {
      if (projectMenuRef.current && !projectMenuRef.current.contains(e.target as Node)) {
        setShowProjectMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showProjectMenu])

  async function handleMoveToProject(projectId: string | null) {
    setShowProjectMenu(false)
    const prevProjectId = item.project_id
    onUpdate(item.id, { project_id: projectId } as Partial<Item>)
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId }),
      })
      if (!res.ok) throw new Error()
      const targetName = projectId ? projects.find((p) => p.id === projectId)?.name : null
      toast.success(targetName ? `Moved to ${targetName}` : "Removed from project")
    } catch {
      onUpdate(item.id, { project_id: prevProjectId } as Partial<Item>)
      toast.error("Failed to move item")
    }
  }

  const editControls = (
    <div className="flex items-center gap-1.5 mt-2">
      <button
        onClick={handleEditSave}
        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
      >
        <Check className="h-3 w-3" />
        저장
      </button>
      <button
        onClick={handleEditCancel}
        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-muted-foreground text-xs font-medium hover:bg-muted transition-colors"
      >
        <X className="h-3 w-3" />
        취소
      </button>
      <span className="text-[10px] text-muted-foreground/40 ml-auto hidden sm:inline">Ctrl+Enter로 저장</span>
    </div>
  )

  const editTextarea = (placeholder: string) => (
    <textarea
      ref={textareaRef}
      value={editContent}
      onChange={(e) => {
        setEditContent(e.target.value)
        e.target.style.height = "auto"
        e.target.style.height = e.target.scrollHeight + "px"
      }}
      placeholder={placeholder}
      className="w-full text-[15px] leading-relaxed bg-muted/30 border border-border/60 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleEditSave()
        if (e.key === "Escape") handleEditCancel()
      }}
    />
  )

  const renderContent = () => {
    if (item.type === "link" && isLinkMeta(meta)) {
      return (
        <div className="space-y-2">
          <LinkCard url={item.content} meta={meta} />
          {item.context?.link_analysis && (
            <div className="flex items-start gap-2 rounded-lg bg-blue-500/5 border border-blue-500/10 px-3 py-2">
              <Sparkles className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-foreground/70 leading-relaxed whitespace-pre-wrap">
                {item.context.link_analysis}
              </p>
            </div>
          )}
        </div>
      )
    }

    if (item.type === "image" && isImageMeta(meta)) {
      return (
        <div className="space-y-2">
          <ImageCard
            imageUrl={meta.image_url}
            caption={!editing && item.content !== "Image" ? item.content : undefined}
            screenshot={meta.screenshot}
          />
          {editing && (
            <>
              {editTextarea("Add a caption...")}
              {editControls}
            </>
          )}
        </div>
      )
    }

    if (item.type === "voice" && isVoiceMeta(meta)) {
      return (
        <div className="space-y-2">
          <VoiceCard
            fileUrl={meta.file_url}
            duration={meta.duration}
            transcript={!editing ? meta.transcript : undefined}
          />
          {editing && (
            <>
              {editTextarea("Edit transcript...")}
              {editControls}
            </>
          )}
        </div>
      )
    }

    // Text editing mode
    if (editing) {
      return (
        <div className="space-y-2">
          {editTextarea("Edit content...")}
          {editControls}
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
                요약 보기
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                전체 보기
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
            {item.project_id && (() => {
              const proj = projects.find((p) => p.id === item.project_id)
              return proj ? (
                <span className="inline-flex items-center gap-1 text-[10px] tracking-wide px-2 py-0.5 rounded-md font-medium bg-sage/10 text-sage border-0">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: proj.color }} />
                  {proj.name}
                </span>
              ) : null
            })()}
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
                분석 중
              </span>
            )}
            <span className="text-[11px] text-muted-foreground/40 ml-auto tabular-nums">
              {timeAgo(item.created_at)}
            </span>
          </div>

          {/* AI Comment */}
          {item.context?.ai_comment && (
            <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
              <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-foreground/70 leading-relaxed">
                {item.context.ai_comment}
              </p>
            </div>
          )}

          {/* Related items (exclude self, deduplicate) */}
          {related.length > 0 && (
            <div className="pt-2 border-t border-border/30">
              <p className="text-[10px] tracking-[0.15em] uppercase font-semibold text-muted-foreground/40 mb-1.5">
                Related
              </p>
              <div className="flex flex-wrap gap-1.5">
                {related
                  .filter((r) => r.id !== item.id)
                  .filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i)
                  .map((r) => (
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
          hovered ? "opacity-100" : "opacity-0 md:opacity-0"
        } max-md:opacity-100`}>
          {item.type !== "link" && !editing && (
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
          <div className="relative" ref={projectMenuRef}>
            <button
              onClick={() => setShowProjectMenu(!showProjectMenu)}
              className={`h-7 w-7 flex items-center justify-center rounded-lg transition-all duration-200 ${
                item.project_id
                  ? "text-sage bg-sage/10"
                  : "text-muted-foreground/40 hover:text-sage hover:bg-sage/8"
              }`}
              aria-label="Move to project"
            >
              <FolderOpen className="h-3 w-3" />
            </button>
            {showProjectMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-border/60 bg-popover shadow-lg z-50 py-1">
                <p className="px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase font-semibold text-muted-foreground/50">
                  Move to
                </p>
                {item.project_id && (
                  <button
                    onClick={() => handleMoveToProject(null)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
                  >
                    <X className="h-3 w-3" />
                    Remove from project
                  </button>
                )}
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleMoveToProject(p.id)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                      item.project_id === p.id
                        ? "text-primary bg-primary/5 font-medium"
                        : "text-foreground/70 hover:bg-accent"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="truncate">{p.name}</span>
                    {item.project_id === p.id && <Check className="h-3 w-3 ml-auto shrink-0" />}
                  </button>
                ))}
                {projects.length === 0 && (
                  <p className="px-3 py-1.5 text-xs text-muted-foreground/50 italic">No projects</p>
                )}
              </div>
            )}
          </div>
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
