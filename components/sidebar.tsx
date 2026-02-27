"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { useTheme } from "@/hooks/use-theme"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ContentType } from "@/lib/supabase/types"
import { FileText, Link, Image, Mic, Layers, Sun, Moon, Archive, MoreHorizontal, Pencil, Trash2, Check, X } from "lucide-react"
import { ExportMenu } from "@/components/export-menu"
import { UserMenu } from "@/components/user-menu"

const filters: {
  label: string
  value: ContentType | "all"
  icon: React.ReactNode
  color: string
}[] = [
  { label: "All", value: "all", icon: <Layers className="h-4 w-4" />, color: "text-warm-600" },
  { label: "Ideas", value: "text", icon: <FileText className="h-4 w-4" />, color: "text-terracotta" },
  { label: "Links", value: "link", icon: <Link className="h-4 w-4" />, color: "text-sage" },
  { label: "Images", value: "image", icon: <Image className="h-4 w-4" />, color: "text-dusty-rose" },
  { label: "Voice", value: "voice", icon: <Mic className="h-4 w-4" />, color: "text-amber-accent" },
]

function TagItem({
  tag,
  count,
  active,
  onToggle,
  onRename,
  onDelete,
}: {
  tag: { id: string; name: string }
  count: number
  active: boolean
  onToggle: () => void
  onRename: (name: string) => void
  onDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(tag.name)
  const [confirming, setConfirming] = useState(false)

  if (editing) {
    return (
      <div className="flex items-center gap-1 px-3 py-1.5">
        <input
          autoFocus
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && editName.trim()) {
              onRename(editName.trim())
              setEditing(false)
            }
            if (e.key === "Escape") {
              setEditName(tag.name)
              setEditing(false)
            }
          }}
          className="flex-1 min-w-0 bg-muted/50 border border-border/60 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
        <button
          onClick={() => { if (editName.trim()) { onRename(editName.trim()); setEditing(false) } }}
          className="h-6 w-6 flex items-center justify-center rounded text-primary hover:bg-primary/10 transition-colors"
        >
          <Check className="h-3 w-3" />
        </button>
        <button
          onClick={() => { setEditName(tag.name); setEditing(false) }}
          className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:bg-muted transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="group relative">
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
          active
            ? "bg-primary/10 text-primary font-medium"
            : "text-foreground/70 hover:bg-accent hover:text-foreground"
        }`}
      >
        <span className="flex items-center gap-2">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${
            active ? "bg-primary" : "bg-warm-300 group-hover:bg-warm-400"
          } transition-colors`} />
          {tag.name}
        </span>
        <span className={`text-[11px] tabular-nums ${
          active ? "text-primary/70" : "text-muted-foreground/50"
        }`}>
          {count}
        </span>
      </button>

      {/* Menu trigger */}
      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); setConfirming(false) }}
        className={`absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted transition-all ${
          menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>

      {/* Dropdown menu */}
      {menuOpen && (
        <div className="absolute right-2 top-full mt-0.5 w-32 rounded-lg border border-border/60 bg-popover shadow-lg z-50 py-1">
          <button
            onClick={() => { setEditing(true); setMenuOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground/70 hover:bg-accent transition-colors"
          >
            <Pencil className="h-3 w-3" />
            Rename
          </button>
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-destructive/70 hover:bg-destructive/5 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          ) : (
            <button
              onClick={() => { onDelete(); setMenuOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-destructive font-medium bg-destructive/5 hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              Confirm delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const { tags, items, activeFilter, setActiveFilter, activeTag, setActiveTag, showArchived, setShowArchived, removeTag, renameTag } =
    useStore()
  const { dark, toggle } = useTheme()

  const tagCounts = tags.map((tag) => ({
    ...tag,
    count: items.filter((item) =>
      item.tags?.some((t) => t.name === tag.name)
    ).length,
  }))

  const archivedCount = items.filter((i) => i.is_archived).length

  async function handleRenameTag(id: string, name: string) {
    renameTag(id, name)
    await fetch(`/api/tags/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
  }

  async function handleDeleteTag(id: string) {
    const tagName = tags.find((t) => t.id === id)?.name
    removeTag(id)
    if (activeTag === tagName) setActiveTag(null)
    await fetch(`/api/tags/${id}`, { method: "DELETE" })
  }

  return (
    <aside className="w-64 border-r border-border/60 bg-sidebar flex flex-col h-screen">
      {/* Brand */}
      <div className="px-6 pt-7 pb-5">
        <h1 className="font-display text-2xl tracking-tight text-foreground">
          Mindflow
        </h1>
        <p className="text-[11px] tracking-[0.15em] uppercase text-muted-foreground mt-1 font-medium">
          Personal Knowledge
        </p>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mx-4" />

      <ScrollArea className="flex-1 py-5">
        {/* Tags */}
        <div className="px-4">
          <p className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground/70 px-2 mb-3">
            Collections
          </p>
          {tagCounts.length === 0 && (
            <p className="text-xs text-muted-foreground/50 px-2 italic">
              Tags appear here as AI organizes your thoughts
            </p>
          )}
          <div className="space-y-0.5">
            {tagCounts.map((tag) => (
              <TagItem
                key={tag.id}
                tag={tag}
                count={tag.count}
                active={activeTag === tag.name}
                onToggle={() => {
                  setActiveTag(activeTag === tag.name ? null : tag.name)
                  if (showArchived) setShowArchived(false)
                }}
                onRename={(name) => handleRenameTag(tag.id, name)}
                onDelete={() => handleDeleteTag(tag.id)}
              />
            ))}
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent mx-6 my-5" />

        {/* Filters */}
        <div className="px-4">
          <p className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground/70 px-2 mb-3">
            Type
          </p>
          <div className="space-y-0.5">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => { setActiveFilter(f.value); if (showArchived) setShowArchived(false) }}
                className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                  activeFilter === f.value && !showArchived
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground/70 hover:bg-accent hover:text-foreground"
                }`}
              >
                <span className={activeFilter === f.value && !showArchived ? "text-primary" : f.color}>
                  {f.icon}
                </span>
                <span>{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent mx-6 my-5" />

        {/* Archive */}
        <div className="px-4">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
              showArchived
                ? "bg-primary/10 text-primary font-medium"
                : "text-foreground/70 hover:bg-accent hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Archive className={`h-4 w-4 ${showArchived ? "text-primary" : "text-muted-foreground/50"}`} />
              Archive
            </span>
            {archivedCount > 0 && (
              <span className={`text-[11px] tabular-nums ${
                showArchived ? "text-primary/70" : "text-muted-foreground/50"
              }`}>
                {archivedCount}
              </span>
            )}
          </button>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border/40 space-y-3">
        <UserMenu />
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground/40 tracking-wide">
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Ctrl+K</kbd>
            <span className="ml-2">to search</span>
          </p>
          <div className="flex items-center gap-1">
            <ExportMenu />
            <button
              onClick={toggle}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-all duration-200"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
