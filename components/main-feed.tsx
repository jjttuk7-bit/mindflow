"use client"

import { Composer } from "@/components/composer"
import { FeedList } from "@/components/feed-list"
import { SortDropdown } from "@/components/sort-dropdown"
import { useStore } from "@/lib/store"
import { Archive } from "lucide-react"

export function MainFeed({ onRefetch }: { onRefetch?: () => void }) {
  const { showArchived } = useStore()

  return (
    <main className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
      {/* Composer area (hidden in archive mode) */}
      {!showArchived && (
        <>
          <div className="px-8 pt-8 pb-6">
            <div className="max-w-2xl mx-auto">
              <Composer onSaved={onRefetch} />
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent mx-8" />
        </>
      )}

      {/* Archive header */}
      {showArchived && (
        <div className="px-8 pt-8 pb-4">
          <div className="max-w-2xl mx-auto flex items-center gap-2.5">
            <Archive className="h-5 w-5 text-muted-foreground/50" />
            <h2 className="font-display text-xl text-foreground/70">Archive</h2>
          </div>
        </div>
      )}

      {/* Sort bar */}
      <div className="px-8 py-2">
        <div className="max-w-2xl mx-auto flex justify-end">
          <SortDropdown />
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <FeedList />
        </div>
      </div>
    </main>
  )
}
