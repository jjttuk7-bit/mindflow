"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import { toast } from "sonner"
import { Sidebar } from "@/components/sidebar"
import { MainFeed } from "@/components/main-feed"
import { BottomNav } from "@/components/bottom-nav"
import { FAB } from "@/components/fab"
import { MobileHeader } from "@/components/mobile-header"
import { FilterChips } from "@/components/filter-chips"
import { useItems } from "@/hooks/use-items"
import { useProjects } from "@/hooks/use-projects"
import { useTodos } from "@/hooks/use-todos"
import { useOfflineSync } from "@/hooks/use-offline-sync"
import { useStore } from "@/lib/store"

const ChatPanel = dynamic(() => import("@/components/chat-panel").then(m => m.ChatPanel), { ssr: false })
const SearchDialog = dynamic(() => import("@/components/search-dialog").then(m => m.SearchDialog), { ssr: false })
const MobileComposer = dynamic(() => import("@/components/mobile-composer").then(m => m.MobileComposer), { ssr: false })
const Onboarding = dynamic(() => import("@/components/onboarding").then(m => m.Onboarding), { ssr: false })
const TodoList = dynamic(() => import("@/components/todo-list").then(m => m.TodoList))
const MoreMenu = dynamic(() => import("@/components/more-menu").then(m => m.MoreMenu))
const MobileProjectList = dynamic(() => import("@/components/mobile-project-list").then(m => m.MobileProjectList))
const PushPrompt = dynamic(() => import("@/components/push-prompt").then(m => m.PushPrompt), { ssr: false })
const ClipboardSuggest = dynamic(() => import("@/components/clipboard-suggest").then(m => m.ClipboardSuggest), { ssr: false })
const ArchivePinDialog = dynamic(() => import("@/components/archive-pin-dialog").then(m => m.ArchivePinDialog), { ssr: false })

export function Dashboard() {
  const { refetch, loading, loadMore, loadingMore, hasMore } = useItems()
  useProjects()
  useTodos()
  useOfflineSync(refetch)

  const searchParams = useSearchParams()
  const { sidebarView, activeTab, composerOpen, isOffline, setArchivePinSet } = useStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (searchParams.get("shared") === "success") {
      toast.success("공유된 콘텐츠가 저장되었습니다!")
      window.history.replaceState({}, "", "/")
    }
    if (searchParams.get("error") === "share_failed") {
      toast.error("공유 저장에 실패했습니다")
      window.history.replaceState({}, "", "/")
    }
  }, [searchParams])

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (!data.preferences?.onboarding_completed) {
          setShowOnboarding(true)
        }
        if (data.preferences?.archive_pin) {
          setArchivePinSet(true)
        }
      })
      .catch(() => {})
  }, [setArchivePinSet])

  const renderMobileContent = () => {
    switch (activeTab) {
      case "feed":
        return <MainFeed onRefetch={refetch} onMenuClick={() => setSidebarOpen(true)} mobile loading={loading} loadMore={loadMore} loadingMore={loadingMore} hasMore={hasMore} />
      case "projects":
        return <MobileProjectList />
      case "todos":
        return <TodoList onMenuClick={() => setSidebarOpen(true)} />
      case "chat":
        return <ChatPanel fullScreen />
      case "more":
        return <MoreMenu />
      default:
        return <MainFeed onRefetch={refetch} onMenuClick={() => setSidebarOpen(true)} mobile loading={loading} loadMore={loadMore} loadingMore={loadingMore} hasMore={hasMore} />
    }
  }

  return (
    <div className="flex h-screen bg-background flex-col">
      {/* Offline banner */}
      {isOffline && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 text-center text-xs font-medium text-amber-700 dark:text-amber-400 shrink-0">
          You&apos;re offline — cached content is shown. New items will sync when reconnected.
        </div>
      )}
      <div className="flex flex-1 min-h-0">
      {/* Desktop layout */}
      <div className="hidden md:contents">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        {sidebarView === "todos" ? (
          <TodoList onMenuClick={() => setSidebarOpen(true)} />
        ) : (
          <MainFeed onRefetch={refetch} onMenuClick={() => setSidebarOpen(true)} loading={loading} loadMore={loadMore} loadingMore={loadingMore} hasMore={hasMore} />
        )}
        <ChatPanel />
      </div>

      {/* Mobile layout */}
      <div className="md:hidden flex flex-col w-full h-screen">
        <MobileHeader />
        {activeTab === "feed" && <PushPrompt />}
        {activeTab === "feed" && <ClipboardSuggest onSaved={refetch} />}
        {activeTab === "feed" && <FilterChips />}
        <div className="flex-1 overflow-hidden">
          {renderMobileContent()}
        </div>
        {activeTab === "feed" && <FAB />}
        <BottomNav />
      </div>

      {/* Shared */}
      <SearchDialog />
      {composerOpen && <MobileComposer onSaved={refetch} />}
      {showOnboarding && <Onboarding onComplete={() => setShowOnboarding(false)} />}
      <ArchivePinDialog />
      </div>
    </div>
  )
}
