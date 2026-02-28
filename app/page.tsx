"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { MainFeed } from "@/components/main-feed"
import { SearchDialog } from "@/components/search-dialog"
import { ChatPanel } from "@/components/chat-panel"
import { TodoList } from "@/components/todo-list"
import { BottomNav } from "@/components/bottom-nav"
import { FAB } from "@/components/fab"
import { MobileHeader } from "@/components/mobile-header"
import { FilterChips } from "@/components/filter-chips"
import { MoreMenu } from "@/components/more-menu"
import { MobileProjectList } from "@/components/mobile-project-list"
import { MobileComposer } from "@/components/mobile-composer"
import { useItems } from "@/hooks/use-items"
import { useProjects } from "@/hooks/use-projects"
import { useTodos } from "@/hooks/use-todos"
import { useStore } from "@/lib/store"

export default function Home() {
  const { refetch, loading, loadMore, loadingMore, hasMore } = useItems()
  useProjects()
  useTodos()

  const { sidebarView, activeTab, composerOpen } = useStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
    </div>
  )
}
