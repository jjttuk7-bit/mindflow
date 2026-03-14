"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export type FontSize = "small" | "normal" | "large"

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSize] = useState<FontSize>("normal")

  useEffect(() => {
    // 1. localStorage에서 즉시 로드 (깜빡임 방지)
    const saved = localStorage.getItem("dotline-font-size") as FontSize | null
    if (saved) {
      document.documentElement.setAttribute("data-font-size", saved)
      setFontSize(saved)
    }

    // 2. Supabase에서 사용자 설정 로드
    const loadFromDB = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const res = await fetch("/api/settings")
      if (res.ok) {
        const settings = await res.json()
        const dbFontSize = settings?.preferences?.font_size as FontSize | undefined
        if (dbFontSize && dbFontSize !== saved) {
          document.documentElement.setAttribute("data-font-size", dbFontSize)
          localStorage.setItem("dotline-font-size", dbFontSize)
          setFontSize(dbFontSize)
        }
      }
    }
    loadFromDB()
  }, [])

  return <>{children}</>
}

export function useFontSize() {
  const [fontSize, setFontSizeState] = useState<FontSize>("normal")

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-font-size") as FontSize
    if (current) setFontSizeState(current)
  }, [])

  const setFontSize = async (size: FontSize) => {
    // 1. 즉시 반영
    document.documentElement.setAttribute("data-font-size", size)
    localStorage.setItem("dotline-font-size", size)
    setFontSizeState(size)

    // 2. DB에 저장
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { font_size: size } }),
      })
    } catch (e) {
      console.error("Failed to save font size:", e)
    }
  }

  return { fontSize, setFontSize }
}
