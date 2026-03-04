"use client"

import { useState, useEffect } from "react"
import { Item } from "@/lib/supabase/types"
import { Badge } from "@/components/ui/badge"
import { Sparkles, X, FileText, Link, Image, Mic } from "lucide-react"

const typeIcons: Record<string, React.ReactNode> = {
  text: <FileText className="h-3.5 w-3.5" />,
  link: <Link className="h-3.5 w-3.5" />,
  image: <Image className="h-3.5 w-3.5" />,
  voice: <Mic className="h-3.5 w-3.5" />,
}

interface ResurfacedData {
  item: Item
  reason: string
  related_to?: string
}

export function ResurfacedMemory() {
  const [data, setData] = useState<ResurfacedData | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if already dismissed today
    const dismissedAt = sessionStorage.getItem("resurface_dismissed")
    if (dismissedAt) {
      setDismissed(true)
      setLoading(false)
      return
    }

    // Hide if briefing is active (it already shows rediscoveries)
    const briefingDismissed = sessionStorage.getItem("briefing_dismissed")
    if (!briefingDismissed) {
      setDismissed(true)
      setLoading(false)
      return
    }

    fetch("/api/ai/resurface")
      .then((r) => r.ok ? r.json() : null)
      .then((res) => {
        if (res?.item) setData(res)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleDismiss() {
    setDismissed(true)
    sessionStorage.setItem("resurface_dismissed", Date.now().toString())
  }

  if (loading || dismissed || !data) return null

  const { item, reason, related_to } = data
  const displayContent = item.summary || item.content

  return (
    <div className="relative rounded-xl border border-amber-accent/20 bg-gradient-to-r from-amber-accent/5 to-transparent px-5 py-4 animate-in fade-in slide-in-from-top-2 duration-500">
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-amber-accent/15">
          <Sparkles className="h-3.5 w-3.5 text-amber-accent" />
        </div>
        <span className="text-[11px] tracking-[0.1em] uppercase font-semibold text-amber-accent">
          {reason}
        </span>
      </div>

      {/* Content */}
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex items-center justify-center w-7 h-7 rounded-lg bg-muted/50 text-muted-foreground/50 shrink-0">
          {typeIcons[item.type] || typeIcons.text}
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-[14px] leading-relaxed text-foreground/80 line-clamp-3">
            {displayContent}
          </p>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {item.tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="text-[9px] tracking-wide px-1.5 py-0 rounded font-medium bg-muted/50 text-muted-foreground/60 border-0"
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Related context */}
          {related_to && (
            <p className="text-[11px] text-muted-foreground/40 italic">
              최근 메모와 연결: &ldquo;{related_to}...&rdquo;
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
