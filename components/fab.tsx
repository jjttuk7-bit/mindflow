"use client"

import { useStore } from "@/lib/store"
import { Plus } from "lucide-react"

export function FAB() {
  const { setComposerOpen } = useStore()

  return (
    <button
      onClick={() => setComposerOpen(true)}
      className="fixed right-4 bottom-20 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 flex items-center justify-center active:scale-95 transition-transform md:hidden"
      aria-label="New capture"
    >
      <Plus className="h-6 w-6" />
    </button>
  )
}
