"use client"

import { useState, useEffect } from "react"
import { UserMenu } from "@/components/user-menu"
import { Search } from "lucide-react"

export function MobileHeader() {
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    // Check in and fetch streak
    fetch("/api/streak", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.current_streak) setStreak(data.current_streak)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="flex items-center justify-between px-4 pt-3 pb-1 md:hidden safe-area-top">
      <div className="flex items-center gap-2">
        <h1 className="font-display text-xl tracking-tight text-foreground">DotLine</h1>
        {streak >= 2 && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-500/10 text-xs font-semibold text-orange-500 animate-in fade-in duration-300">
            🔥 {streak}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }))
          }}
          className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>
        <UserMenu />
      </div>
    </div>
  )
}
