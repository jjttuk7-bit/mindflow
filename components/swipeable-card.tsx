"use client"

import { useRef, useState, useCallback } from "react"
import { Archive, Pin } from "lucide-react"

interface SwipeableCardProps {
  children: React.ReactNode
  onSwipeLeft: () => void
  onSwipeRight: () => void
  onLongPress?: () => void
}

export function SwipeableCard({ children, onSwipeLeft, onSwipeRight, onLongPress }: SwipeableCardProps) {
  const [deltaX, setDeltaX] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const isHorizontal = useRef<boolean | null>(null)
  const triggered = useRef(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFired = useRef(false)

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    isHorizontal.current = null
    triggered.current = false
    longPressFired.current = false
    setSwiping(true)

    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        longPressFired.current = true
        onLongPress()
        // Reset swipe state to prevent accidental swipe after menu opens
        setDeltaX(0)
        setSwiping(false)
      }, 500)
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!swiping || longPressFired.current) return
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current

    // Cancel long press if finger moves
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      clearLongPress()
    }

    if (isHorizontal.current === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        isHorizontal.current = Math.abs(dx) > Math.abs(dy)
      }
      return
    }

    if (!isHorizontal.current) return
    // Prevent browser default (scroll/navigation) during horizontal swipe
    e.preventDefault()
    setDeltaX(dx)
  }

  function handleTouchEnd() {
    clearLongPress()
    if (longPressFired.current) return

    if (!triggered.current) {
      if (deltaX < -80) {
        triggered.current = true
        onSwipeLeft()
      } else if (deltaX > 80) {
        triggered.current = true
        onSwipeRight()
      }
    }
    setDeltaX(0)
    setSwiping(false)
    isHorizontal.current = null
  }

  const absX = Math.abs(deltaX)
  const progress = Math.min(absX / 80, 1)

  return (
    <div className={`relative rounded-xl ${swiping ? "overflow-hidden" : ""} md:overflow-visible`}>
      {deltaX < -10 && (
        <div className="absolute inset-0 flex items-center justify-end px-6 bg-destructive/10 rounded-xl">
          <Archive className={`h-5 w-5 text-destructive transition-opacity ${progress >= 1 ? "opacity-100" : "opacity-40"}`} />
        </div>
      )}
      {deltaX > 10 && (
        <div className="absolute inset-0 flex items-center justify-start px-6 bg-amber-500/10 rounded-xl">
          <Pin className={`h-5 w-5 text-amber-600 transition-opacity ${progress >= 1 ? "opacity-100" : "opacity-40"}`} />
        </div>
      )}

      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${deltaX}px)`,
          transition: swiping ? "none" : "transform 0.3s ease-out",
          touchAction: "pan-y",
        }}
        className="relative bg-card rounded-xl"
      >
        {children}
      </div>
    </div>
  )
}
