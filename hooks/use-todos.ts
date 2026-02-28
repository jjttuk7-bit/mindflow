"use client"

import { useEffect, useCallback } from "react"
import { useStore } from "@/lib/store"

export function useTodos() {
  const { setTodos } = useStore()

  const fetchTodos = useCallback(async () => {
    const res = await fetch("/api/todos")
    if (res.ok) {
      const data = await res.json()
      setTodos(data)
    }
  }, [setTodos])

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  return { refetch: fetchTodos }
}
