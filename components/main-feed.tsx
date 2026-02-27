"use client"

import { Composer } from "@/components/composer"
import { FeedList } from "@/components/feed-list"

export function MainFeed({ onRefetch }: { onRefetch?: () => void }) {
  return (
    <main className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
      {/* Composer area */}
      <div className="px-8 pt-8 pb-6">
        <div className="max-w-2xl mx-auto">
          <Composer onSaved={onRefetch} />
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent mx-8" />

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <FeedList />
        </div>
      </div>
    </main>
  )
}
