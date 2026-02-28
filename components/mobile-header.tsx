"use client"

import { UserMenu } from "@/components/user-menu"
import { Search } from "lucide-react"

export function MobileHeader() {
  return (
    <div className="flex items-center justify-between px-4 pt-3 pb-1 md:hidden safe-area-top">
      <h1 className="font-display text-xl tracking-tight text-foreground">Mindflow</h1>
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
