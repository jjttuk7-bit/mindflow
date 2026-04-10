"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { useTheme } from "@/hooks/use-theme"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ContentType } from "@/lib/supabase/types"
import {
  FileText,
  Link,
  Image,
  Mic,
  Layers,
  Sun,
  Moon,
  Archive,
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
  X,
  FolderOpen,
  ListTodo,
  BarChart3,
  GitBranch,
  Settings,
  Plus,
  ChevronDown,
  Pin,
  CalendarDays,
  MessageSquare,
  Tag,
} from "lucide-react"
import { ExportMenu } from "@/components/export-menu"
import { DotLineLogo } from "@/components/dotline-logo"
import { SidebarFeedbackButton } from "@/components/feedback-dialog"
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
        <span className={`text-ui-sm tabular-nums ${
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
              Confirm
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    tags, items, activeFilter, setActiveFilter, activeTag, setActiveTag,
    showArchived, setShowArchived, showTrash, setShowTrash, removeTag, renameTag,
    projects, activeProject, setActiveProject, addProject, removeProject,
    todos, sidebarView, setSidebarView, setChatOpen,
    smartFolder, setSmartFolder,
    archivePinSet, setShowPinDialog,
  } = useStore()
  const { dark, toggle } = useTheme()

  const [creatingProject, setCreatingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [projectsExpanded, setProjectsExpanded] = useState(true)
  const [tagsExpanded, setTagsExpanded] = useState(false)
  const [projectsShowAll, setProjectsShowAll] = useState(false)

  const TAG_DISPLAY_LIMIT = 5
  const PROJECT_DISPLAY_LIMIT = 5

  const tagCounts = tags.map((tag) => ({
    ...tag,
    count: items.filter((item) =>
      item.tags?.some((t) => t.name === tag.name)
    ).length,
  }))

  const archivedCount = items.filter((i) => i.is_archived && !i.deleted_at).length
  const trashedCount = items.filter((i) => !!i.deleted_at).length
  const pinnedCount = items.filter((i) => i.is_pinned && !i.is_archived && !i.deleted_at).length
  const thisWeekCount = (() => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return items.filter((i) => !i.is_archived && !i.deleted_at && new Date(i.created_at) >= weekAgo).length
  })()
  const pendingTodoCount = todos.filter((t) => !t.is_completed).length

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

  async function handleCreateProject() {
    if (!newProjectName.trim()) return
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newProjectName.trim() }),
    })
    if (res.ok) {
      const project = await res.json()
      addProject(project)
    }
    setNewProjectName("")
    setCreatingProject(false)
  }

  async function handleDeleteProject(id: string) {
    await fetch(`/api/projects/${id}`, { method: "DELETE" })
    removeProject(id)
    if (activeProject === id) setActiveProject(null)
  }

  function getItemCountForProject(projectId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const project = projects.find((p) => p.id === projectId) as any
    if (project?.items && Array.isArray(project.items) && project.items.length > 0) {
      return project.items[0]?.count ?? 0
    }
    return items.filter((i) => i.project_id === projectId).length
  }

  return (
    <aside className={`w-64 border-r border-border/60 bg-sidebar flex flex-col h-screen fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "-translate-x-full pointer-events-none"} md:relative md:inset-auto md:z-auto md:translate-x-0 md:transition-none md:pointer-events-auto`}>
      {/* Brand - click to reset all filters and go to main feed */}
      <button
        onClick={() => {
          setActiveFilter("all")
          setActiveTag(null)
          setActiveProject(null)
          setSmartFolder(null)
          if (showArchived) setShowArchived(false)
          if (showTrash) setShowTrash(false)
          setSidebarView("feed")
          onClose()
        }}
        className="px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-5 text-left hover:opacity-80 transition-opacity"
      >
        <h1 className="font-display text-2xl tracking-tight text-foreground">
          DotLine
        </h1>
        <p className="text-ui-sm tracking-[0.15em] uppercase text-muted-foreground mt-1 font-medium">
          Personal Knowledge Hub
        </p>
      </button>

      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mx-4" />

      <ScrollArea className="flex-1 py-5">
        {/* Projects */}
        <div className="px-4">
          <div className="flex items-center justify-between px-2 mb-3">
            <button
              onClick={() => setProjectsExpanded(!projectsExpanded)}
              className="flex items-center gap-1 text-ui-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground/70"
            >
              <ChevronDown className={`h-3 w-3 transition-transform ${projectsExpanded ? "" : "-rotate-90"}`} />
              Projects
            </button>
            <button
              onClick={() => setCreatingProject(true)}
              className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-colors"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          {projectsExpanded && (
            <div className="space-y-0.5">
              {projects.length === 0 && !creatingProject && (
                <p className="text-xs text-muted-foreground/50 px-2 italic">
                  No projects yet
                </p>
              )}
              {(projectsShowAll ? projects : projects.slice(0, PROJECT_DISPLAY_LIMIT)).map((project) => (
                <div key={project.id} className="group relative">
                  <button
                    onClick={() => {
                      setActiveProject(activeProject === project.id ? null : project.id)
                      setSmartFolder(null)
                    }}
                    className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                      activeProject === project.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground/70 hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="truncate">{project.name}</span>
                    </span>
                    <span className={`text-ui-sm tabular-nums flex-shrink-0 ${
                      activeProject === project.id ? "text-primary/70" : "text-muted-foreground/50"
                    }`}>
                      {getItemCountForProject(project.id)}
                    </span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id) }}
                    className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded text-muted-foreground/30 hover:text-destructive hover:bg-destructive/5 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {projects.length > PROJECT_DISPLAY_LIMIT && (
                <button
                  onClick={() => setProjectsShowAll(!projectsShowAll)}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted-foreground/60 hover:text-foreground hover:bg-accent transition-all duration-200"
                >
                  <ChevronDown className={`h-3 w-3 transition-transform ${projectsShowAll ? "rotate-180" : ""}`} />
                  {projectsShowAll ? "접기" : `+${projects.length - PROJECT_DISPLAY_LIMIT} more`}
                </button>
              )}
              {creatingProject && (
                <div className="flex items-center gap-1 px-3 py-1.5">
                  <input
                    autoFocus
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateProject()
                      if (e.key === "Escape") { setCreatingProject(false); setNewProjectName("") }
                    }}
                    placeholder="프로젝트 이름..."
                    className="flex-1 min-w-0 bg-muted/50 border border-border/60 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <button
                    onClick={handleCreateProject}
                    className="h-6 w-6 flex items-center justify-center rounded text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => { setCreatingProject(false); setNewProjectName("") }}
                    className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent mx-6 my-5" />

        {/* Smart Folders */}
        <div className="px-4">
          <p className="text-ui-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground/70 px-2 mb-3">
            Quick Access
          </p>
          <div className="space-y-0.5">
            <button
              onClick={() => {
                if (smartFolder === "this-week") {
                  setSmartFolder(null)
                } else {
                  setSmartFolder("this-week")
                  setSidebarView("feed")
                  setActiveFilter("all")
                  setActiveTag(null)
                  setActiveProject(null)
                  if (showArchived) setShowArchived(false)
                  if (showTrash) setShowTrash(false)
                }
              }}
              className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                smartFolder === "this-week"
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground/70 hover:bg-accent hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <CalendarDays className={`h-4 w-4 ${smartFolder === "this-week" ? "text-primary" : "text-muted-foreground/50"}`} />
                This Week
              </span>
              <span className={`text-ui-sm tabular-nums ${
                smartFolder === "this-week" ? "text-primary/70" : "text-muted-foreground/50"
              }`}>
                {thisWeekCount}
              </span>
            </button>
            <button
              onClick={() => {
                if (smartFolder === "pinned") {
                  setSmartFolder(null)
                } else {
                  setSmartFolder("pinned")
                  setSidebarView("feed")
                  setActiveFilter("all")
                  setActiveTag(null)
                  setActiveProject(null)
                  if (showArchived) setShowArchived(false)
                  if (showTrash) setShowTrash(false)
                }
              }}
              className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                smartFolder === "pinned"
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground/70 hover:bg-accent hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Pin className={`h-4 w-4 ${smartFolder === "pinned" ? "text-primary" : "text-muted-foreground/50"}`} />
                Pinned
              </span>
              {pinnedCount > 0 && (
                <span className={`text-ui-sm tabular-nums ${
                  smartFolder === "pinned" ? "text-primary/70" : "text-muted-foreground/50"
                }`}>
                  {pinnedCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent mx-6 my-5" />

        {/* Tags */}
        <div className="px-4">
          <p className="text-ui-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground/70 px-2 mb-3">
            태그
          </p>
          {tagCounts.length === 0 && (
            <p className="text-xs text-muted-foreground/50 px-2 italic">
              AI가 노트를 정리하면 태그가 표시됩니다
            </p>
          )}
          <div className="space-y-0.5">
            {(tagsExpanded ? tagCounts : tagCounts.slice(0, TAG_DISPLAY_LIMIT)).map((tag) => (
              <TagItem
                key={tag.id}
                tag={tag}
                count={tag.count}
                active={activeTag === tag.name}
                onToggle={() => {
                  setActiveTag(activeTag === tag.name ? null : tag.name)
                  if (showArchived) setShowArchived(false)
                  if (showTrash) setShowTrash(false)
                  setSmartFolder(null)
                }}
                onRename={(name) => handleRenameTag(tag.id, name)}
                onDelete={() => handleDeleteTag(tag.id)}
              />
            ))}
            {tagCounts.length > TAG_DISPLAY_LIMIT && (
              <button
                onClick={() => setTagsExpanded(!tagsExpanded)}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted-foreground/60 hover:text-foreground hover:bg-accent transition-all duration-200"
              >
                <ChevronDown className={`h-3 w-3 transition-transform ${tagsExpanded ? "rotate-180" : ""}`} />
                {tagsExpanded ? "Show less" : `+${tagCounts.length - TAG_DISPLAY_LIMIT} more`}
              </button>
            )}
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent mx-6 my-5" />

        {/* Type Filters */}
        <div className="px-4">
          <p className="text-ui-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground/70 px-2 mb-3">
            Types
          </p>
          <div className="space-y-0.5">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => { setActiveFilter(f.value); if (showArchived) setShowArchived(false); if (showTrash) setShowTrash(false); setSmartFolder(null); setActiveProject(null) }}
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

        {/* Navigation */}
        <div className="px-4 space-y-0.5">
          <button
            onClick={() => { setSidebarView(sidebarView === "todos" ? "feed" : "todos"); onClose() }}
            className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
              sidebarView === "todos"
                ? "bg-primary/10 text-primary font-medium"
                : "text-foreground/70 hover:bg-accent hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <ListTodo className={`h-4 w-4 ${sidebarView === "todos" ? "text-primary" : "text-muted-foreground/50"}`} />
              할 일
            </span>
            {pendingTodoCount > 0 && (
              <span className={`text-ui-sm tabular-nums px-2 py-0.5 rounded-full min-w-[1.5rem] text-center flex-shrink-0 ${
                sidebarView === "todos"
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground/60"
              }`}>
                {pendingTodoCount}
              </span>
            )}
          </button>
          <a
            href="/insights"
            onClick={onClose}
            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground/70 hover:bg-accent hover:text-foreground transition-all duration-200"
          >
            <BarChart3 className="h-4 w-4 text-muted-foreground/50" />
            인사이트
          </a>
          <a
            href="/tags"
            onClick={onClose}
            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground/70 hover:bg-accent hover:text-foreground transition-all duration-200"
          >
            <Tag className="h-4 w-4 text-muted-foreground/50" />
            태그
          </a>
          <a
            href="/knowledge-map"
            onClick={onClose}
            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground/70 hover:bg-accent hover:text-foreground transition-all duration-200"
          >
            <GitBranch className="h-4 w-4 text-muted-foreground/50" />
            지식 맵
          </a>
          <a
            href="/profile/ai"
            onClick={onClose}
            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground/70 hover:bg-accent hover:text-foreground transition-all duration-200"
          >
            <DotLineLogo className="h-4 w-4 text-muted-foreground/50" />
            AI 프로필
          </a>
          <button
            onClick={() => { setChatOpen(true); onClose() }}
            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground/70 hover:bg-accent hover:text-foreground transition-all duration-200"
          >
            <MessageSquare className="h-4 w-4 text-muted-foreground/50" />
            AI 챗
          </button>
          <SidebarFeedbackButton onClose={onClose} />
          <button
            onClick={() => {
              if (!showArchived && archivePinSet && sessionStorage.getItem("archive_unlocked") !== "true") {
                setShowPinDialog(true)
                return
              }
              setShowArchived(!showArchived); setSmartFolder(null); if (!showArchived && showTrash) setShowTrash(false)
            }}
            className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
              showArchived
                ? "bg-primary/10 text-primary font-medium"
                : "text-foreground/70 hover:bg-accent hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Archive className={`h-4 w-4 ${showArchived ? "text-primary" : "text-muted-foreground/50"}`} />
              보관함
            </span>
            {archivedCount > 0 && (
              <span className={`text-ui-sm tabular-nums ${
                showArchived ? "text-primary/70" : "text-muted-foreground/50"
              }`}>
                {archivedCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { setShowTrash(!showTrash); setSmartFolder(null); if (!showTrash && showArchived) setShowArchived(false) }}
            className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
              showTrash
                ? "bg-destructive/10 text-destructive font-medium"
                : "text-foreground/70 hover:bg-accent hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Trash2 className={`h-4 w-4 ${showTrash ? "text-destructive" : "text-muted-foreground/50"}`} />
              Trash
            </span>
            {trashedCount > 0 && (
              <span className={`text-ui-sm tabular-nums ${
                showTrash ? "text-destructive/70" : "text-muted-foreground/50"
              }`}>
                {trashedCount}
              </span>
            )}
          </button>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t border-border/40 space-y-3">
        <UserMenu />
        <div className="flex items-center gap-2 px-1">
          <a href="/terms" className="text-ui-xs text-muted-foreground/35 hover:text-muted-foreground transition-colors">이용약관</a>
          <span className="text-muted-foreground/20 text-ui-xs">|</span>
          <a href="/privacy" className="text-ui-xs text-muted-foreground/35 hover:text-muted-foreground transition-colors">개인정보처리방침</a>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-ui-xs text-muted-foreground/40 tracking-wide">
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-ui-xs font-mono">Ctrl+K</kbd>
            <span className="ml-2">검색</span>
          </p>
          <div className="flex items-center gap-1">
            <a
              href="/settings"
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-all duration-200"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </a>
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
