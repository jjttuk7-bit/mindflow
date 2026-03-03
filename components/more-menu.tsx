"use client"

import { useStore } from "@/lib/store"
import { useTheme } from "@/hooks/use-theme"
import { ExportMenu } from "@/components/export-menu"
import { FeedbackButton } from "@/components/feedback-dialog"
import {
  CalendarDays, Pin, Archive, Trash2, BarChart3, GitBranch, Settings, Sun, Moon,
} from "lucide-react"
import { DotLineLogo } from "@/components/dotline-logo"

export function MoreMenu() {
  const {
    showArchived, setShowArchived, showTrash, setShowTrash, smartFolder, setSmartFolder,
    setActiveFilter, setActiveTag, setActiveProject, setActiveTab,
    items,
  } = useStore()
  const { dark, toggle } = useTheme()

  const archivedCount = items.filter((i) => i.is_archived && !i.deleted_at).length
  const trashedCount = items.filter((i) => !!i.deleted_at).length
  const pinnedCount = items.filter((i) => i.is_pinned && !i.is_archived && !i.deleted_at).length
  const thisWeekCount = (() => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return items.filter((i) => !i.is_archived && !i.deleted_at && new Date(i.created_at) >= weekAgo).length
  })()

  function goToSmartFolder(folder: string) {
    setSmartFolder(folder)
    setActiveFilter("all")
    setActiveTag(null)
    setActiveProject(null)
    if (showArchived) setShowArchived(false)
    if (showTrash) setShowTrash(false)
    setActiveTab("feed")
  }

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      <div className="px-4 pt-4 pb-3">
        <h2 className="font-display text-xl tracking-tight text-foreground">더보기</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-20 space-y-1">
        <p className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground/70 px-3 pt-2 pb-2">
          스마트 폴더
        </p>
        <button
          onClick={() => goToSmartFolder("this-week")}
          className={`w-full flex items-center justify-between rounded-xl px-4 py-3.5 text-sm transition-colors ${
            smartFolder === "this-week" ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent"
          }`}
        >
          <span className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-muted-foreground/60" />
            이번 주
          </span>
          <span className="text-xs text-muted-foreground/50 tabular-nums">{thisWeekCount}</span>
        </button>
        <button
          onClick={() => goToSmartFolder("pinned")}
          className={`w-full flex items-center justify-between rounded-xl px-4 py-3.5 text-sm transition-colors ${
            smartFolder === "pinned" ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent"
          }`}
        >
          <span className="flex items-center gap-3">
            <Pin className="h-5 w-5 text-muted-foreground/60" />
            고정됨
          </span>
          <span className="text-xs text-muted-foreground/50 tabular-nums">{pinnedCount}</span>
        </button>
        <button
          onClick={() => { setShowArchived(!showArchived); setSmartFolder(null); if (!showArchived && showTrash) setShowTrash(false); setActiveTab("feed") }}
          className={`w-full flex items-center justify-between rounded-xl px-4 py-3.5 text-sm transition-colors ${
            showArchived ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent"
          }`}
        >
          <span className="flex items-center gap-3">
            <Archive className="h-5 w-5 text-muted-foreground/60" />
            보관함
          </span>
          <span className="text-xs text-muted-foreground/50 tabular-nums">{archivedCount}</span>
        </button>
        <button
          onClick={() => { setShowTrash(!showTrash); setSmartFolder(null); if (!showTrash && showArchived) setShowArchived(false); setActiveTab("feed") }}
          className={`w-full flex items-center justify-between rounded-xl px-4 py-3.5 text-sm transition-colors ${
            showTrash ? "bg-destructive/10 text-destructive font-medium" : "hover:bg-accent"
          }`}
        >
          <span className="flex items-center gap-3">
            <Trash2 className="h-5 w-5 text-muted-foreground/60" />
            Trash
          </span>
          <span className="text-xs text-muted-foreground/50 tabular-nums">{trashedCount}</span>
        </button>

        <p className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground/70 px-3 pt-6 pb-2">
          설정
        </p>
        <a href="/profile/ai" className="w-full flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm hover:bg-accent transition-colors">
          <DotLineLogo className="h-5 w-5 text-muted-foreground/60" />
          AI Profile
        </a>
        <a href="/insights" className="w-full flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm hover:bg-accent transition-colors">
          <BarChart3 className="h-5 w-5 text-muted-foreground/60" />
          Insights
        </a>
        <a href="/knowledge-map" className="w-full flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm hover:bg-accent transition-colors">
          <GitBranch className="h-5 w-5 text-muted-foreground/60" />
          지식 맵
        </a>
        <a href="/settings" className="w-full flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm hover:bg-accent transition-colors">
          <Settings className="h-5 w-5 text-muted-foreground/60" />
          설정
        </a>
        <FeedbackButton />
        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm hover:bg-accent transition-colors"
        >
          {dark ? <Sun className="h-5 w-5 text-muted-foreground/60" /> : <Moon className="h-5 w-5 text-muted-foreground/60" />}
          {dark ? "라이트 모드" : "다크 모드"}
        </button>
        <div className="px-1 pt-2">
          <ExportMenu />
        </div>

        <div className="flex items-center gap-3 px-4 pt-6 pb-4">
          <a href="/terms" className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors">
            이용약관
          </a>
          <span className="text-muted-foreground/20">|</span>
          <a href="/privacy" className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors">
            개인정보처리방침
          </a>
        </div>
      </div>
    </main>
  )
}
