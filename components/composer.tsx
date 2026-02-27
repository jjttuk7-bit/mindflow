"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { ContentType } from "@/lib/supabase/types"
import { FileText, Link, Image, Mic, ArrowUp } from "lucide-react"

const typeButtons: {
  type: ContentType
  icon: React.ReactNode
  label: string
}[] = [
  { type: "text", icon: <FileText className="h-3.5 w-3.5" />, label: "Text" },
  { type: "link", icon: <Link className="h-3.5 w-3.5" />, label: "Link" },
  { type: "image", icon: <Image className="h-3.5 w-3.5" />, label: "Image" },
  { type: "voice", icon: <Mic className="h-3.5 w-3.5" />, label: "Voice" },
]

export function Composer({ onSaved }: { onSaved?: () => void }) {
  const [content, setContent] = useState("")
  const [activeType, setActiveType] = useState<ContentType>("text")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const { addItem } = useStore()

  async function handleSubmit() {
    if (!content.trim()) return
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: activeType, content: content.trim() }),
      })
      if (res.ok) {
        const item = await res.json()
        addItem({ ...item, tags: [] })
        setContent("")
        onSaved?.()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div
      className={`rounded-xl border bg-card transition-all duration-300 ${
        isFocused
          ? "shadow-[0_2px_20px_-4px_oklch(0.62_0.14_40/0.12)] border-primary/30"
          : "shadow-sm border-border/60 hover:border-border"
      }`}
    >
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="What's on your mind?"
        className="w-full min-h-[88px] resize-none bg-transparent px-5 pt-4 pb-2 text-[15px] leading-relaxed focus:outline-none placeholder:text-muted-foreground/40 placeholder:italic"
        disabled={isSubmitting}
      />
      <div className="flex items-center justify-between px-3 pb-3">
        <div className="flex gap-0.5">
          {typeButtons.map((btn) => (
            <button
              key={btn.type}
              onClick={() => setActiveType(btn.type)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                activeType === btn.type
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {btn.icon}
              <span>{btn.label}</span>
            </button>
          ))}
        </div>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !content.trim()}
          size="sm"
          className="rounded-lg h-8 px-3 gap-1.5 text-xs font-medium"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
              Saving
            </span>
          ) : (
            <>
              <ArrowUp className="h-3.5 w-3.5" />
              Save
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
