"use client"

import { useState } from "react"
import { Share2, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function ShareButton({ itemId }: { itemId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "copied">("idle")

  async function handleShare() {
    setState("loading")
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      })
      if (!res.ok) {
        setState("idle")
        toast.error("공유 링크 생성에 실패했습니다")
        return
      }

      const { token } = await res.json()
      const url = `${window.location.origin}/share/${token}`

      // Mobile: use native Web Share API
      if (navigator.share) {
        try {
          await navigator.share({
            title: "Mindflow",
            text: "Mindflow에서 공유된 항목입니다",
            url,
          })
          setState("idle")
          return
        } catch (e) {
          // User cancelled or share failed — fallback to clipboard
          if ((e as Error).name === "AbortError") {
            setState("idle")
            return
          }
        }
      }

      // Desktop: copy to clipboard + toast
      await navigator.clipboard.writeText(url)
      setState("copied")
      toast.success("공유 링크가 복사되었습니다")
      setTimeout(() => setState("idle"), 2000)
    } catch {
      setState("idle")
      toast.error("공유에 실패했습니다")
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={state === "loading"}
      className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-sage hover:bg-sage/8 transition-all duration-200"
      aria-label="Share item"
    >
      {state === "loading" ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : state === "copied" ? (
        <Check className="h-3 w-3 text-sage" />
      ) : (
        <Share2 className="h-3 w-3" />
      )}
    </button>
  )
}
