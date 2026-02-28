"use client"

import { Sidebar } from "@/components/sidebar"
import { MainFeed } from "@/components/main-feed"
import { SearchDialog } from "@/components/search-dialog"
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

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      {sidebarView === "todos" ? <TodoList /> : <MainFeed onRefetch={refetch} />}
      <SearchDialog />
    </div>
  )
}
