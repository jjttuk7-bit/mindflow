"use client"

import { useEffect, useCallback } from "react"
import { useStore } from "@/lib/store"

export function useProjects() {
  const { setProjects } = useStore()

  const fetchProjects = useCallback(async () => {
    const res = await fetch("/api/projects")
    if (res.ok) {
      const data = await res.json()
      setProjects(data)
    }
  }, [setProjects])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return { refetch: fetchProjects }
}
