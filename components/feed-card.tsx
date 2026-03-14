"use client"

import { useState, useEffect, useRef, memo } from "react"
import { Item, LinkMeta, ImageMeta, ExpiryMeta, FileMeta, ItemContext } from "@/lib/supabase/types"
import { Badge } from "@/components/ui/badge"
import { LinkCard } from "@/components/link-card"
import { ImageCard } from "@/components/image-card"
import { FileText, Link, Image, Mic, Paperclip, Trash2, ChevronDown, ChevronUp, Pin, Archive, ArchiveRestore, Pencil, Check, X, FolderOpen, Sparkles, Undo2, CloudOff, Plus, Tag as TagIcon } from "lucide-react"
import { ShareButton } from "@/components/share-button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { VoiceCard } from "@/components/voice-card"
import { FileCard } from "@/components/file-card"
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
  file: {
    icon: <Paperclip className="h-3.5 w-3.5" />,
    color: "text-indigo-500 bg-indigo-500/10",
    label: "File",
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

function getExpiryInfo(meta: unknown): { expiry: ExpiryMeta; daysLeft: number } | null {
  if (!meta || typeof meta !== "object") return null
  const m = meta as { expiry?: ExpiryMeta; screenshot?: { expiry?: { detected?: boolean; expiry_date?: string } } }
  const expiry = m.expiry?.expiry_date ? m.expiry : (
    m.screenshot?.expiry?.detected && m.screenshot.expiry.expiry_date
      ? { expiry_date: m.screenshot.expiry.expiry_date } as ExpiryMeta
      : null
  )
  if (!expiry?.expiry_date) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiryDate = new Date(expiry.expiry_date)
  expiryDate.setHours(0, 0, 0, 0)
  const daysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return { expiry, daysLeft }
}

function ExpiryBadge({ meta, itemId, onUpdate }: { meta: unknown; itemId: string; onUpdate: (id: string, updates: Partial<Item>) => void }) {
  const [editingExpiry, setEditingExpiry] = useState(false)
  const info = getExpiryInfo(meta)

  const handleDateChange = async (newDate: string) => {
    setEditingExpiry(false)
    if (!newDate) return
    try {
      const res = await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: { ...(meta as Record<string, unknown>), expiry: { ...info?.expiry, expiry_date: newDate } } }),
      })
      if (res.ok) {
        const updated = await res.json()
        onUpdate(itemId, updated)
        toast.success("만료일 수정됨")
      }
    } catch {
      toast.error("만료일 수정 실패")
    }
  }

  if (!info) return null
  const { daysLeft } = info
  const label = daysLeft > 0 ? `D-${daysLeft}` : "만료"
  const colorClass =
    daysLeft <= 0 ? "bg-red-500/10 text-red-500 line-through" :
    daysLeft <= 3 ? "bg-red-500/10 text-red-500" :
    daysLeft <= 7 ? "bg-amber-500/10 text-amber-500" :
    "bg-muted text-muted-foreground"

  if (editingExpiry) {
    return (
      <input
        type="date"
        defaultValue={info.expiry.expiry_date}
        autoFocus
        className="text-ui-sm px-1.5 py-0.5 rounded-md border border-border bg-background"
        onBlur={(e) => handleDateChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleDateChange((e.target as HTMLInputElement).value)
          if (e.key === "Escape") setEditingExpiry(false)
        }}
      />
    )
  }

  return (
    <button
      onClick={() => setEditingExpiry(true)}
      title="클릭하여 만료일 수정"
      className={`text-ui-xs px-1.5 py-0.5 rounded-full font-medium cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all ${colorClass}`}
    >
      {label}
    </button>
  )
}

function isLinkMeta(meta: unknown): meta is LinkMeta {
  return !!meta && typeof meta === "object" && "og_url" in meta
}

function isImageMeta(meta: unknown): meta is ImageMeta {
  return !!meta && typeof meta === "object" && "image_url" in meta
}

function isVoiceMeta(meta: unknown): meta is VoiceMeta {
  return !!meta && typeof meta === "object" && "file_url" in meta && "duration" in meta
}

function isFileMeta(meta: unknown): meta is FileMeta {
  return !!meta && typeof meta === "object" && "file_url" in meta && "file_name" in meta
}

interface RelatedItem {
  id: string
  content: string
  summary?: string
  type: string
  similarity: number
}

export const FeedCard = memo(function FeedCard({
  item,
  onDelete,
  onUpdate,
  onRestore,
  showTrash,
}: {
  item: Item
  onDelete: (id: string) => void
  onUpdate: (id: string, updates: Partial<Item>) => void
  onRestore?: (id: string) => void
  showTrash?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(item.content)
  const [related, setRelated] = useState<RelatedItem[]>([])
  const [relatedLoaded, setRelatedLoaded] = useState(false)
  const [showProjectMenu, setShowProjectMenu] = useState(false)
  const [tagEditing, setTagEditing] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const tagInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const cardRef = useRef<HTMLElement>(null)
  const { projects, tags: allTags, justSavedId, setJustSavedId } = useStore()

  // Highlight is computed directly from store (no useState delay)
  const isJustSaved = justSavedId === item.id

  // Debug: log when justSavedId matches
  useEffect(() => {
    if (justSavedId) {
      console.log(`[DotLine] FeedCard ${item.id.slice(0,8)}: justSavedId=${justSavedId.slice(0,8)}, match=${isJustSaved}`)
    }
  }, [justSavedId, item.id, isJustSaved])

  // Scroll into view and auto-clear highlight after 4s
  useEffect(() => {
    if (!isJustSaved) return
    console.log(`[DotLine] Highlight active for ${item.id.slice(0,8)}, scrolling...`)
    // Scroll the card into view
    const scrollTimer = setTimeout(() => {
      const el = cardRef.current || document.querySelector(`[data-item-id="${item.id}"]`)
      console.log(`[DotLine] Scroll target:`, el ? 'found' : 'NOT FOUND')
      el?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 300)
    // Clear highlight after 4s
    const clearTimer = setTimeout(() => {
      setJustSavedId(null)
    }, 4000)
    return () => {
      clearTimeout(scrollTimer)
      clearTimeout(clearTimer)
    }
  }, [isJustSaved, item.id, setJustSavedId])

  // Connection discovery — capture justSavedId match immediately, run check later
  const connCheckedRef = useRef(false)
  const shouldCheckConnection = useRef(false)

  // Capture the match immediately (before justSavedId gets cleared at 4s)
  useEffect(() => {
    if (justSavedId === item.id && !connCheckedRef.current) {
      shouldCheckConnection.current = true
    }
  }, [justSavedId, item.id])

  useEffect(() => {
    if (!shouldCheckConnection.current || connCheckedRef.current) return
    connCheckedRef.current = true

    const showConnectionToast = (conn: { id: string; created_at: string; summary?: string; content: string }) => {
      const daysAgo = Math.floor((Date.now() - new Date(conn.created_at).getTime()) / (1000 * 60 * 60 * 24))
      const timeLabel = daysAgo >= 30
        ? `${Math.floor(daysAgo / 30)}달 전`
        : `${daysAgo}일 전`
      const connTitle = conn.summary || conn.content
      const preview = connTitle.length > 30 ? connTitle.slice(0, 30) + "..." : connTitle
      toast(`과거 기록과 연결되었어요`, {
        description: `${timeLabel}에 저장한 "${preview}"`,
        icon: <Sparkles className="h-4 w-4 text-amber-500" />,
        duration: 15000,
        closeButton: true,
        action: {
          label: "보러가기",
          onClick: () => {
            const el = document.querySelector(`[data-item-id="${conn.id}"]`)
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" })
              el.classList.add("ring-2", "ring-amber-500/50")
              setTimeout(() => el.classList.remove("ring-2", "ring-amber-500/50"), 3000)
            }
          },
        },
      })
    }

    const checkConnections = async (retriesLeft: number) => {
      try {
        const res = await fetch(`/api/items/${item.id}/related`)
        if (!res.ok) return
        const related = await res.json()
        if (Array.isArray(related) && related.length > 0) {
          showConnectionToast(related[0])
        } else if (retriesLeft > 0) {
          setTimeout(() => checkConnections(retriesLeft - 1), 8000)
        }
      } catch {}
    }

    // First attempt at 5s, retries at 13s, 21s (3 attempts total)
    setTimeout(() => checkConnections(2), 5000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justSavedId, item.id])
  const config = typeConfig[item.type] ?? typeConfig.text
  const meta = item.metadata
  const isOfflineItem = item._offline === true

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


  async function handleMoveToProject(projectId: string | null) {
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

  async function handleAddTag(name: string) {
    const trimmed = name.trim().toLowerCase()
    if (!trimmed) return
    // Optimistic: check if already has this tag
    if (item.tags?.some((t) => t.name.toLowerCase() === trimmed)) {
      setNewTagName("")
      return
    }
    try {
      const res = await fetch(`/api/items/${item.id}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) throw new Error()
      const tag = await res.json()
      const currentTags = item.tags || []
      onUpdate(item.id, { tags: [...currentTags, tag] } as Partial<Item>)
      setNewTagName("")
    } catch {
      toast.error("태그 추가 실패")
    }
  }

  async function handleRemoveTag(tagId: string) {
    const prevTags = item.tags || []
    onUpdate(item.id, { tags: prevTags.filter((t) => t.id !== tagId) } as Partial<Item>)
    try {
      const res = await fetch(`/api/items/${item.id}/tags`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag_id: tagId }),
      })
      if (!res.ok) throw new Error()
    } catch {
      onUpdate(item.id, { tags: prevTags } as Partial<Item>)
      toast.error("태그 제거 실패")
    }
  }

  // Focus tag input when editing starts
  useEffect(() => {
    if (tagEditing && tagInputRef.current) {
      tagInputRef.current.focus()
    }
  }, [tagEditing])

  // Filter suggestions for tag autocomplete
  const tagSuggestions = newTagName.trim()
    ? allTags
        .filter((t) => t.name.toLowerCase().includes(newTagName.trim().toLowerCase()))
        .filter((t) => !item.tags?.some((it) => it.id === t.id))
        .slice(0, 5)
    : []

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
      <span className="text-ui-xs text-muted-foreground/40 ml-auto hidden sm:inline">Ctrl+Enter로 저장</span>
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
      className="w-full text-ui-base leading-relaxed bg-muted/30 border border-border/60 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
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
              <p className="text-xs text-foreground/70 leading-relaxed whitespace-pre-wrap break-words">
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
            itemId={item.id}
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
            itemId={item.id}
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

    if (item.type === "file" && isFileMeta(meta)) {
      return (
        <div className="space-y-2">
          <FileCard meta={meta} itemId={item.id} />
          {editing && (
            <>
              {editTextarea("메모 수정...")}
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
        <p className="text-ui-base leading-relaxed whitespace-pre-wrap break-words text-foreground/90">
          {displayText}
        </p>
        {hasSummary && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-1.5 text-ui-sm text-primary/60 hover:text-primary transition-colors"
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
      ref={cardRef}
      data-item-id={item.id}
      className={`group relative rounded-xl border bg-card px-5 py-4 transition-all duration-300 ${
        isJustSaved
          ? "ring-2 ring-primary bg-primary/5 shadow-lg scale-[1.01]"
          : isOfflineItem
            ? "border-dashed border-muted-foreground/30 opacity-80"
            : hovered
              ? "shadow-[0_2px_16px_-4px_oklch(0.5_0.05_55/0.08)] border-border"
              : "border-border/40 shadow-none"
      } ${item.is_pinned ? "ring-1 ring-primary/20" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Just-saved indicator */}
      {isJustSaved && (
        <div className="absolute -top-2 left-4 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-ui-xs font-bold tracking-wide z-10">
          NEW
        </div>
      )}
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
        <div className="flex-1 min-w-0 space-y-1.5 md:space-y-2.5">
          {renderContent()}

          {/* Tags + Meta */}
          <div className="flex items-center gap-2 flex-wrap">
            <ExpiryBadge meta={item.metadata} itemId={item.id} onUpdate={onUpdate} />
            {item.project_id && (() => {
              const proj = projects.find((p) => p.id === item.project_id)
              return proj ? (
                <span className="inline-flex items-center gap-1 text-ui-xs tracking-wide px-2 py-0.5 rounded-md font-medium bg-sage/10 text-sage border-0">
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
                  className={`text-ui-xs tracking-wide px-2 py-0.5 rounded-md font-medium bg-muted/70 text-muted-foreground border-0 ${
                    tagEditing ? "hover:bg-destructive/10 hover:text-destructive cursor-pointer pr-1" : "hover:bg-muted"
                  }`}
                  onClick={tagEditing ? () => handleRemoveTag(tag.id) : undefined}
                >
                  {tag.name}
                  {tagEditing && <X className="h-2.5 w-2.5 ml-1 inline" />}
                </Badge>
              ))
            ) : !tagEditing ? (
              <span className="inline-flex items-center gap-1.5 text-ui-sm text-muted-foreground/50 italic">
                <span className="h-1 w-1 rounded-full bg-amber-accent animate-pulse" />
                분석 중
              </span>
            ) : null}
            {/* Tag add input */}
            {tagEditing && (
              <div className="relative inline-flex">
                <input
                  ref={tagInputRef}
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddTag(newTagName)
                    }
                    if (e.key === "Escape") {
                      setTagEditing(false)
                      setNewTagName("")
                    }
                  }}
                  onBlur={() => {
                    if (newTagName.trim()) handleAddTag(newTagName)
                    else { setTagEditing(false); setNewTagName("") }
                  }}
                  placeholder="태그 입력..."
                  className="h-5 w-24 text-ui-xs px-2 py-0.5 rounded-md border border-border/60 bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                {tagSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-36 bg-popover border border-border rounded-md shadow-md z-20 py-0.5">
                    {tagSuggestions.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleAddTag(t.name)}
                        className="w-full text-left px-2 py-1 text-ui-sm text-foreground/70 hover:bg-accent truncate"
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Tag edit toggle button */}
            {!showTrash && (
              <button
                onClick={() => {
                  setTagEditing(!tagEditing)
                  setNewTagName("")
                }}
                className={`h-4 w-4 flex items-center justify-center rounded transition-colors ${
                  tagEditing
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground/30 hover:text-muted-foreground/60"
                }`}
                title={tagEditing ? "태그 편집 완료" : "태그 편집"}
              >
                {tagEditing ? <Check className="h-2.5 w-2.5" /> : <Plus className="h-2.5 w-2.5" />}
              </button>
            )}
            {isOfflineItem && (
              <span className="inline-flex items-center gap-1 text-ui-xs px-1.5 py-0.5 rounded-md font-medium bg-amber-500/10 text-amber-600">
                <CloudOff className="h-3 w-3" />
                Sync pending
              </span>
            )}
            <span className="text-ui-sm text-muted-foreground/40 ml-auto tabular-nums">
              {timeAgo(item.created_at)}
            </span>
          </div>

          {/* AI Comment — skip for links (they have link_analysis instead) */}
          {item.context?.ai_comment && !(item.type === "link" && item.context?.link_analysis) && (
            <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2.5">
              <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <p className="text-ui-sm text-foreground/80 leading-relaxed">
                {item.context.ai_comment}
              </p>
            </div>
          )}

          {/* Related items (exclude self, deduplicate) */}
          {related.length > 0 && (
            <div className="pt-2 border-t border-border/30">
              <p className="text-ui-xs tracking-[0.15em] uppercase font-semibold text-muted-foreground/40 mb-1.5">
                Related
              </p>
              <div className="flex flex-wrap gap-1.5">
                {related
                  .filter((r) => r.id !== item.id)
                  .filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i)
                  .map((r) => (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/40 text-ui-sm text-muted-foreground/70 hover:bg-muted/70 transition-colors cursor-default"
                  >
                    {typeConfig[r.type]?.icon}
                    <span className="truncate max-w-[120px] sm:max-w-[180px]">
                      {r.summary || r.content}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className={`shrink-0 flex flex-col gap-1 transition-all duration-200 ${
          hovered ? "opacity-100" : "opacity-0 md:opacity-0"
        } max-md:opacity-100`}>
          {showTrash ? (
            <>
              <button
                onClick={() => onRestore?.(item.id)}
                className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-primary/8 transition-all duration-200"
                title="복원"
                aria-label="복원"
              >
                <Undo2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/8 transition-all duration-200"
                title="영구 삭제"
                aria-label="영구 삭제"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              {item.type !== "link" && !editing && (
                <button
                  onClick={() => { setEditContent(item.content); setEditing(true) }}
                  className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-primary/8 transition-all duration-200"
                  title="수정"
                  aria-label="Edit item"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={handlePin}
                className={`h-9 w-9 flex items-center justify-center rounded-lg transition-all duration-200 ${
                  item.is_pinned
                    ? "text-primary bg-primary/8"
                    : "text-muted-foreground/40 hover:text-primary hover:bg-primary/8"
                }`}
                title={item.is_pinned ? "고정 해제" : "고정"}
                aria-label={item.is_pinned ? "Unpin item" : "Pin item"}
              >
                <Pin className={`h-4 w-4 ${item.is_pinned ? "fill-primary" : ""}`} />
              </button>
              <ShareButton item={item} />
              <DropdownMenu open={showProjectMenu} onOpenChange={setShowProjectMenu}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`h-9 w-9 flex items-center justify-center rounded-lg transition-all duration-200 ${
                      item.project_id
                        ? "text-sage bg-sage/10"
                        : "text-muted-foreground/40 hover:text-sage hover:bg-sage/8"
                    }`}
                    title="프로젝트 이동"
                    aria-label="Move to project"
                  >
                    <FolderOpen className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 !max-h-60">
                  <DropdownMenuLabel className="text-ui-xs tracking-[0.15em] uppercase font-semibold text-muted-foreground/50">
                    Move to
                  </DropdownMenuLabel>
                  {item.project_id && (
                    <DropdownMenuItem onClick={() => handleMoveToProject(null)} className="text-xs text-muted-foreground">
                      <X className="h-3 w-3" />
                      Remove from project
                    </DropdownMenuItem>
                  )}
                  {projects.map((p) => (
                    <DropdownMenuItem
                      key={p.id}
                      onClick={() => handleMoveToProject(p.id)}
                      className={`text-xs ${
                        item.project_id === p.id
                          ? "text-primary font-medium"
                          : "text-foreground/70"
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="truncate">{p.name}</span>
                      {item.project_id === p.id && <Check className="h-3 w-3 ml-auto shrink-0" />}
                    </DropdownMenuItem>
                  ))}
                  {projects.length === 0 && (
                    <p className="px-3 py-1.5 text-xs text-muted-foreground/50 italic">No projects</p>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <button
                onClick={handleArchive}
                className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-amber-accent hover:bg-amber-accent/8 transition-all duration-200"
                title={item.is_archived ? "보관 해제" : "보관"}
                aria-label={item.is_archived ? "Restore item" : "Archive item"}
              >
                {item.is_archived ? (
                  <ArchiveRestore className="h-4 w-4" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/8 transition-all duration-200"
                title="삭제"
                aria-label="Delete item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  )
})
