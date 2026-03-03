"use client"

import { useEffect, useRef } from "react"
import { useStore } from "@/lib/store"
import { getOfflineQueue, removeFromOfflineQueue } from "@/lib/offline-store"
import { toast } from "sonner"

export function useOfflineSync(refetch: () => void) {
  const { setIsOffline, addItem, removeItem } = useStore()
  const syncingRef = useRef(false)
  const refetchRef = useRef(refetch)
  refetchRef.current = refetch

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false)
      syncQueue()
    }

    function handleOffline() {
      setIsOffline(true)
    }

    // Set initial state
    if (typeof navigator !== "undefined") {
      setIsOffline(!navigator.onLine)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Try syncing on mount if online (e.g. items queued from previous session)
    if (typeof navigator !== "undefined" && navigator.onLine) {
      syncQueue()
    }

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function syncQueue() {
    if (syncingRef.current) return
    syncingRef.current = true

    try {
      const queue = await getOfflineQueue()
      if (queue.length === 0) return

      let synced = 0

      for (const item of queue) {
        try {
          const res = await fetch("/api/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: item.type,
              content: item.content,
              metadata: item.metadata,
            }),
          })

          if (res.ok) {
            const serverItem = await res.json()
            // Replace temp offline item with real server item seamlessly
            removeItem(item.id)
            addItem({ ...serverItem, tags: [] })
            await removeFromOfflineQueue(item.id)
            synced++

            // Trigger AI tagging for synced text/link items
            if (item.type === "text" || item.type === "link") {
              fetch("/api/ai/tag", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  item_id: serverItem.id,
                  content: item.content,
                  type: item.type,
                }),
              }).catch(() => {})
            }
          }
        } catch {
          // Network still flaky, stop trying
          break
        }
      }

      if (synced > 0) {
        toast.success(`${synced} item${synced > 1 ? "s" : ""} synced`)
        refetchRef.current()
      }
    } finally {
      syncingRef.current = false
    }
  }
}
