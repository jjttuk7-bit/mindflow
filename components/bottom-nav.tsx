"use client"

import { useStore } from "@/lib/store"
import { Home, FolderOpen, ListTodo, MessageSquare, MoreHorizontal } from "lucide-react"

const tabs = [
  { id: "feed" as const, icon: Home, label: "Feed" },
  { id: "projects" as const, icon: FolderOpen, label: "Projects" },
  { id: "todos" as const, icon: ListTodo, label: "Todo" },
  { id: "chat" as const, icon: MessageSquare, label: "Chat" },
  { id: "more" as const, icon: MoreHorizontal, label: "More" },
]

export function BottomNav() {
  const { activeTab, setActiveTab } = useStore()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-lg md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                active ? "text-primary" : "text-muted-foreground/60"
              }`}
            >
              <tab.icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
