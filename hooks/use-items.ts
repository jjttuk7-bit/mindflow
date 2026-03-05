"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useStore } from "@/lib/store"
import { toast } from "sonner"
import { getCachedItems } from "@/lib/offline-store"

const PAGE_SIZE = 20

export function useItems() {
  const { setItems, setTags, setIsOffline, activeFilter, activeTag, activeProject, showTrash } = useStore()
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const offsetRef = useRef(0)
  const hasMoreRef = useRef(true)
  const loadingMoreRef = useRef(false)
  const cacheLoadedRef = useRef(false)

  const buildParams = useCallback(() => {
    const params = new URLSearchParams()
    if (activeFilter !== "all") params.set("type", activeFilter)
    if (activeTag) params.set("tag", activeTag)
    if (activeProject) params.set("project_id", activeProject)
    return params
  }, [activeFilter, activeTag, activeProject])

  const fetchItems = useCallback(async () => {
    // Load cached items first for instant display (only on initial load)
    if (!cacheLoadedRef.current) {
      cacheLoadedRef.current = true
      try {
        const cached = await getCachedItems()
        if (cached.length > 0) {
          setItems(cached)
          setLoading(false)
        }
      } catch {
        // IndexedDB not available, continue with network
      }
    }

    try {
      setError(null)
      offsetRef.current = 0
      hasMoreRef.current = true
      setHasMore(true)
      const params = buildParams()
      params.set("limit", String(PAGE_SIZE))
      params.set("offset", "0")

      const res = await fetch(`/api/items?${params}`)
      if (!res.ok) throw new Error(`Failed to load (${res.status})`)
      const data = await res.json()
      setItems(data) // also caches to IndexedDB via store
      setIsOffline(false)
      offsetRef.current = data.length
      if (data.length < PAGE_SIZE) {
        hasMoreRef.current = false
        setHasMore(false)
      }
    } catch (err) {
      const hasItems = useStore.getState().items.length > 0
      if (hasItems) {
        // We have cached items, show offline mode silently
        setIsOffline(true)
        toast("Offline mode - showing cached items", { duration: 3000 })
      } else {
        const msg = err instanceof Error ? err.message : "Failed to load items"
        setError(msg)
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }, [buildParams, setItems, setIsOffline])

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags")
      if (!res.ok) return
      const data = await res.json()
      setTags(data)
    } catch {
      // Tags are non-critical
    }
  }, [setTags])

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    try {
      const params = buildParams()
      params.set("limit", String(PAGE_SIZE))
      params.set("offset", String(offsetRef.current))
      const res = await fetch(`/api/items?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data.length < PAGE_SIZE) {
        hasMoreRef.current = false
        setHasMore(false)
      }
      const currentItems = useStore.getState().items
      setItems([...currentItems, ...data])
      offsetRef.current += data.length
    } catch {
      // Silent fail for load more
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }, [buildParams, setItems])

  useEffect(() => {
    setLoading(true)
    fetchItems()
    fetchTags()
  }, [fetchItems, fetchTags])

  // When entering trash view, fetch trashed items and merge into store
  const trashLoadedRef = useRef(false)
  useEffect(() => {
    if (!showTrash) {
      trashLoadedRef.current = false
      return
    }
    if (trashLoadedRef.current) return
    trashLoadedRef.current = true

    async function fetchTrash() {
      try {
        const res = await fetch(`/api/items?trash=true&limit=50&offset=0`)
        if (!res.ok) return
        const trashItems = await res.json()
        if (trashItems.length > 0) {
          const currentItems = useStore.getState().items
          const existingIds = new Set(currentItems.map((i: { id: string }) => i.id))
          const newTrashItems = trashItems.filter((i: { id: string }) => !existingIds.has(i.id))
          if (newTrashItems.length > 0) {
            setItems([...currentItems, ...newTrashItems])
          }
        }
      } catch {}
    }
    fetchTrash()
  }, [showTrash, setItems])

  const refetch = useCallback(() => {
    setLoading(true)
    fetchItems()
    fetchTags()
  }, [fetchItems, fetchTags])

  return { refetch, loading, loadMore, loadingMore, hasMore, error }
}
