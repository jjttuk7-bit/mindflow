"use client"

import { useState } from "react"
import { Share2, Check } from "lucide-react"
import { Item, LinkMeta } from "@/lib/supabase/types"
import { toast } from "sonner"

function buildShareText(item: Item): string {
  const parts: string[] = []

  if (item.type === "link") {
    const meta = item.metadata as LinkMeta | undefined
    if (meta?.og_title) parts.push(meta.og_title)
    if (meta?.og_description) parts.push(meta.og_description)
    parts.push(item.content) // URL
  } else if (item.type === "voice") {
    const meta = item.metadata as { transcript?: string } | undefined
    parts.push(meta?.transcript || item.content)
  } else {
    // text, image
    parts.push(item.content)
  }

  // Add AI comment if available
  if (item.context?.ai_comment) {
    parts.push(`\n💡 ${item.context.ai_comment}`)
  }

  // Add tags
  if (item.tags && item.tags.length > 0) {
    parts.push(`\n${item.tags.map((t) => `#${t.name}`).join(" ")}`)
  }

  return parts.filter(Boolean).join("\n")
}

export function ShareButton({ item }: { item: Item }) {
  const [state, setState] = useState<"idle" | "copied">("idle")

  async function handleShare() {
    const text = buildShareText(item)

    // Mobile: use native Web Share API
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.summary || item.content.slice(0, 50),
          text,
        })
        return
      } catch (e) {
        if ((e as Error).name === "AbortError") return
        // Fallback to clipboard
      }
    }

    // Desktop: copy to clipboard
    try {
      await navigator.clipboard.writeText(text)
      setState("copied")
      toast.success("내용이 복사되었습니다")
      setTimeout(() => setState("idle"), 2000)
    } catch {
      toast.error("복사에 실패했습니다")
    }
  }

  return (
    <button
      onClick={handleShare}
      className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-sage hover:bg-sage/8 transition-all duration-200"
      aria-label="Share item"
    >
      {state === "copied" ? (
        <Check className="h-3 w-3 text-sage" />
      ) : (
        <Share2 className="h-3 w-3" />
      )}
    </button>
  )
}
