"use client"

import { useEffect, useCallback } from "react"
import { useStore } from "@/lib/store"

export function useItems() {
  const { setItems, setTags, activeFilter, activeTag } = useStore()

  const fetchItems = useCallback(async () => {
    const params = new URLSearchParams()
    if (activeFilter !== "all") params.set("type", activeFilter)
    if (activeTag) params.set("tag", activeTag)

    const res = await fetch(`/api/items?${params}`)
    if (res.ok) {
      const data = await res.json()
      setItems(data)
    }
  }, [activeFilter, activeTag, setItems])

  const fetchTags = useCallback(async () => {
    const res = await fetch("/api/tags")
    if (res.ok) {
      const data = await res.json()
      setTags(data)
    }
  }, [setTags])

  useEffect(() => {
    fetchItems()
    fetchTags()
  }, [fetchItems, fetchTags])

  return {
    refetch: () => {
      fetchItems()
      fetchTags()
    },
  }
}
