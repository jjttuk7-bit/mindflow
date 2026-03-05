"use client"

import { useState } from "react"
import { Share2, Check } from "lucide-react"
import { Item, LinkMeta } from "@/lib/supabase/types"
import { toast } from "sonner"

function buildShareText(item: Item): string {
  if (item.type === "link") {
    return item.content // URL only
  } else if (item.type === "voice") {
    const meta = item.metadata as { transcript?: string } | undefined
    return meta?.transcript || item.content
  } else {
    // text, image
    return item.content
  }
}

export function ShareButton({ item }: { item: Item }) {
  const [state, setState] = useState<"idle" | "copied">("idle")

  async function handleShare() {
    const text = buildShareText(item)

    // Mobile only: use native Web Share API
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    if (isMobile && navigator.share) {
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
