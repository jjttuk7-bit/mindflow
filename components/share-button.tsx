"use client"

import { useState } from "react"
import { Share2, Check, Loader2 } from "lucide-react"

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
      if (res.ok) {
        const { token } = await res.json()
        const url = `${window.location.origin}/share/${token}`
        await navigator.clipboard.writeText(url)
        setState("copied")
        setTimeout(() => setState("idle"), 2000)
      } else {
        setState("idle")
      }
    } catch {
      setState("idle")
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
