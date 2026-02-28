"use client"

import { useState, useRef, useCallback } from "react"
import { RefreshCw } from "lucide-react"

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void
  children: React.ReactNode
  className?: string
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const pulling = useRef(false)
  const threshold = 70

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const el = containerRef.current
      if (!el || el.scrollTop > 0 || refreshing) return
      startY.current = e.touches[0].clientY
      pulling.current = true
    },
    [refreshing]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling.current || refreshing) return
      const el = containerRef.current
      if (!el || el.scrollTop > 0) {
        setPullDistance(0)
        return
      }
      const distance = Math.max(0, e.touches[0].clientY - startY.current)
      setPullDistance(Math.min(distance * 0.4, 100))
    },
    [refreshing]
  )

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return
    pulling.current = false
    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true)
      setPullDistance(40)
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [pullDistance, refreshing, onRefresh])

  return (
    <div
      ref={containerRef}
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {pullDistance > 0 && (
        <div
          className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
          style={{ height: pullDistance }}
        >
          <RefreshCw
            className={`h-5 w-5 text-muted-foreground/60 transition-transform ${
              refreshing ? "animate-spin" : ""
            }`}
            style={{ transform: refreshing ? undefined : `rotate(${pullDistance * 4}deg)` }}
          />
        </div>
      )}
      {children}
    </div>
  )
}
