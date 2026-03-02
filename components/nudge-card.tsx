"use client"

import { useState, useEffect } from "react"
import { Nudge } from "@/lib/supabase/types"
import { Sparkles, Link2, Clock, TrendingUp, CheckSquare, X } from "lucide-react"

const nudgeIcons: Record<string, React.ReactNode> = {
  connection: <Link2 className="h-4 w-4 text-primary" />,
  resurface: <Clock className="h-4 w-4 text-terracotta" />,
  trend: <TrendingUp className="h-4 w-4 text-sage" />,
  action: <CheckSquare className="h-4 w-4 text-dusty-rose" />,
}

export function NudgeCards() {
  const [nudges, setNudges] = useState<Nudge[]>([])

  useEffect(() => {
    fetch("/api/nudges")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setNudges(data)
      })
      .catch(() => {})
  }, [])

  const dismiss = async (id: string) => {
    setNudges((prev) => prev.filter((n) => n.id !== id))
    await fetch("/api/nudges", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
  }

  if (nudges.length === 0) return null

  return (
    <div className="flex flex-col gap-2 mb-4">
      {nudges.slice(0, 2).map((nudge) => (
        <div
          key={nudge.id}
          className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10"
        >
          <div className="mt-0.5">
            {nudgeIcons[nudge.type] || <Sparkles className="h-4 w-4 text-primary" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{nudge.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{nudge.content}</p>
          </div>
          <button
            onClick={() => dismiss(nudge.id)}
            className="text-muted-foreground/60 hover:text-foreground p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
