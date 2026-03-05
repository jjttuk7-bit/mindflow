"use client"

import { useState, useEffect, useCallback } from "react"
import { Link, FileText, X, ArrowUp } from "lucide-react"
import { useStore } from "@/lib/store"
import { toast } from "sonner"

function isValidUrl(str: string): boolean {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

const HANDLED_KEY = "clipboard-handled"
const MAX_HANDLED = 50

function getHandledClips(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HANDLED_KEY) || "[]")
  } catch {
    return []
  }
}

function addHandledClip(text: string) {
  const list = getHandledClips()
  if (!list.includes(text)) {
    list.push(text)
    // Keep only the last 50 entries
    if (list.length > MAX_HANDLED) list.splice(0, list.length - MAX_HANDLED)
  }
  localStorage.setItem(HANDLED_KEY, JSON.stringify(list))
}

export function ClipboardSuggest({ onSaved }: { onSaved?: () => void }) {
  const [clipText, setClipText] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { addItem, updateItem } = useStore()

  const checkClipboard = useCallback(async () => {
    try {
      // Clipboard API requires focus and permissions
      if (!navigator.clipboard?.readText) return
      const text = await navigator.clipboard.readText()
      if (!text || text.trim().length < 3) return

      const trimmed = text.trim()

      // Don't suggest if already saved or dismissed
      if (getHandledClips().includes(trimmed)) return

      setClipText(trimmed)
    } catch {
      // Permission denied or not supported — silently ignore
    }
  }, [])

  useEffect(() => {
    // Check on mount (app open)
    const timer = setTimeout(checkClipboard, 500)

    // Check on visibility change (app comes back to foreground)
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        setTimeout(checkClipboard, 300)
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      clearTimeout(timer)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [checkClipboard])

  async function handleSave() {
    if (!clipText || saving) return
    setSaving(true)

    const isLink = isValidUrl(clipText)
    const type = isLink ? "link" : "text"

    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, content: clipText }),
      })
      if (!res.ok) throw new Error()
      const item = await res.json()
      addItem({ ...item, tags: [] })
      addHandledClip(clipText)
      setClipText(null)
      toast.success("클립보드 내용이 저장되었습니다!")
      onSaved?.()

      // AI tagging is handled server-side via after() in the API route
      // Poll for updated tags after a delay
      setTimeout(async () => {
        try {
          const itemRes = await fetch(`/api/items/${item.id}`)
          if (!itemRes.ok) return
          const updated = await itemRes.json()
          updateItem(item.id, {
            summary: updated.summary,
            context: updated.context,
            tags: updated.tags || [],
            project_id: updated.project_id,
            metadata: updated.metadata,
          })
        } catch {}
      }, 5000)
    } catch {
      toast.error("저장에 실패했습니다")
    } finally {
      setSaving(false)
    }
  }

  function handleDismiss() {
    if (clipText) addHandledClip(clipText)
    setClipText(null)
  }

  if (!clipText) return null

  const isLink = isValidUrl(clipText)
  const preview = clipText.length > 80 ? clipText.slice(0, 80) + "..." : clipText

  return (
    <div className="mx-4 mt-2 animate-in slide-in-from-top duration-300">
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            {isLink ? <Link className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary mb-0.5">
              클립보드에 {isLink ? "링크" : "텍스트"}가 있어요
            </p>
            <p className="text-xs text-muted-foreground line-clamp-2 break-all">{preview}</p>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-2.5 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
          ) : (
            <>
              <ArrowUp className="h-3.5 w-3.5" />
              바로 저장하기
            </>
          )}
        </button>
      </div>
    </div>
  )
}
