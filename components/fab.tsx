"use client"

import { useRef, useCallback } from "react"
import { useStore } from "@/lib/store"
import { Plus } from "lucide-react"

export function FAB() {
  const { setComposerOpen, setComposerDefaultType } = useStore()
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPress = useRef(false)

  const handlePressStart = useCallback(() => {
    isLongPress.current = false
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true
      // Long press: open composer directly in text mode
      setComposerDefaultType?.("text")
      setComposerOpen(true)
    }, 500)
  }, [setComposerOpen, setComposerDefaultType])

  const handlePressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handleClick = useCallback(() => {
    if (!isLongPress.current) {
      setComposerOpen(true)
    }
    isLongPress.current = false
  }, [setComposerOpen])

  return (
    <button
      onClick={handleClick}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      className="fixed right-4 bottom-20 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 flex items-center justify-center active:scale-95 transition-transform md:hidden"
      aria-label="New capture"
    >
      <Plus className="h-6 w-6" />
    </button>
  )
}
