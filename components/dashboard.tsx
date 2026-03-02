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
import { useStore } from "@/lib/store"

const ChatPanel = dynamic(() => import("@/components/chat-panel").then(m => m.ChatPanel), { ssr: false })
const SearchDialog = dynamic(() => import("@/components/search-dialog").then(m => m.SearchDialog), { ssr: false })
const MobileComposer = dynamic(() => import("@/components/mobile-composer").then(m => m.MobileComposer), { ssr: false })
const Onboarding = dynamic(() => import("@/components/onboarding").then(m => m.Onboarding), { ssr: false })
const TodoList = dynamic(() => import("@/components/todo-list").then(m => m.TodoList))
const MoreMenu = dynamic(() => import("@/components/more-menu").then(m => m.MoreMenu))
const MobileProjectList = dynamic(() => import("@/components/mobile-project-list").then(m => m.MobileProjectList))

export function Dashboard() {
  const { refetch, loading, loadMore, loadingMore, hasMore } = useItems()
  useProjects()
  useTodos()

  const searchParams = useSearchParams()
  const { sidebarView, activeTab, composerOpen } = useStore()
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
      })
      .catch(() => {})
  }, [])

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
    <div className="flex h-screen bg-background">
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
    </div>
  )
}
