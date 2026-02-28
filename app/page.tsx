"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { MainFeed } from "@/components/main-feed"
import { SearchDialog } from "@/components/search-dialog"
import { ChatPanel } from "@/components/chat-panel"
import { TodoList } from "@/components/todo-list"
import { useItems } from "@/hooks/use-items"
import { useProjects } from "@/hooks/use-projects"
import { useTodos } from "@/hooks/use-todos"
import { useStore } from "@/lib/store"

export default function Home() {
  const { refetch } = useItems()
  useProjects()
  useTodos()

  const { sidebarView } = useStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile overlay */}
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
        <MainFeed onRefetch={refetch} onMenuClick={() => setSidebarOpen(true)} />
      )}
      <SearchDialog />
      <ChatPanel />
    </div>
  )
}
