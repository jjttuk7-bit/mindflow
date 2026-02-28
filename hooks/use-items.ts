"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useStore } from "@/lib/store"
import { toast } from "sonner"

const PAGE_SIZE = 20

export function useItems() {
  const { setItems, setTags, activeFilter, activeTag, activeProject } = useStore()
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const offsetRef = useRef(0)
  const hasMoreRef = useRef(true)
  const loadingMoreRef = useRef(false)

  const buildParams = useCallback(() => {
    const params = new URLSearchParams()
    if (activeFilter !== "all") params.set("type", activeFilter)
    if (activeTag) params.set("tag", activeTag)
    if (activeProject) params.set("project_id", activeProject)
    return params
  }, [activeFilter, activeTag, activeProject])

  const fetchItems = useCallback(async () => {
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
      setItems(data)
      offsetRef.current = data.length
      if (data.length < PAGE_SIZE) {
        hasMoreRef.current = false
        setHasMore(false)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load items"
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [buildParams, setItems])

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

  const refetch = useCallback(() => {
    setLoading(true)
    fetchItems()
    fetchTags()
  }, [fetchItems, fetchTags])

  return { refetch, loading, loadMore, loadingMore, hasMore, error }
}
