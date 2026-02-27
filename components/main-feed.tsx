"use client"

import { Composer } from "@/components/composer"
import { FeedList } from "@/components/feed-list"

export function MainFeed({ onRefetch }: { onRefetch?: () => void }) {
  return (
    <main className="flex-1 flex flex-col h-screen overflow-hidden">
      <div className="p-6 border-b">
        <Composer onSaved={onRefetch} />
      </div>
      <div className="flex-1 overflow-y-auto">
        <FeedList />
      </div>
    </main>
  )
}
