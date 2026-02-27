"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { ContentType } from "@/lib/supabase/types"
import { FileText, Link, Image, Mic } from "lucide-react"

const typeButtons: {
  type: ContentType
  icon: React.ReactNode
  label: string
}[] = [
  { type: "text", icon: <FileText className="h-4 w-4" />, label: "Text" },
  { type: "link", icon: <Link className="h-4 w-4" />, label: "Link" },
  { type: "image", icon: <Image className="h-4 w-4" />, label: "Image" },
  { type: "voice", icon: <Mic className="h-4 w-4" />, label: "Voice" },
]

export function Composer({ onSaved }: { onSaved?: () => void }) {
  const [content, setContent] = useState("")
  const [activeType, setActiveType] = useState<ContentType>("text")
  const [isSubmitting, setIsSubmitting] = useState(false)
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
    <div className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What's on your mind?"
        className="w-full min-h-[80px] resize-none rounded-lg border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
        disabled={isSubmitting}
      />
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {typeButtons.map((btn) => (
            <Button
              key={btn.type}
              variant={activeType === btn.type ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveType(btn.type)}
            >
              {btn.icon}
              <span className="ml-1">{btn.label}</span>
            </Button>
          ))}
        </div>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !content.trim()}
          size="sm"
        >
          {isSubmitting ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  )
}
