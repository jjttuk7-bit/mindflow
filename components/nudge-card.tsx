"use client"

import { useState, useEffect } from "react"
import { Nudge } from "@/lib/supabase/types"
import { Sparkles, Link2, Clock, TrendingUp, CheckSquare, Gift, Ghost, X, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

const nudgeIcons: Record<string, React.ReactNode> = {
  connection: <Link2 className="h-4 w-4 text-primary" />,
  resurface: <Clock className="h-4 w-4 text-terracotta" />,
  trend: <TrendingUp className="h-4 w-4 text-sage" />,
  action: <CheckSquare className="h-4 w-4 text-dusty-rose" />,
  expiry: <Gift className="h-4 w-4 text-amber-accent" />,
  zombie: <Ghost className="h-4 w-4 text-muted-foreground" />,
}

export function NudgeCards() {
  const router = useRouter()
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
      {nudges.slice(0, 2).map((nudge) => {
        const isConnection = nudge.type === "connection"
        return (
          <div
            key={nudge.id}
            className={`flex items-start gap-3 p-3 rounded-xl border ${
              isConnection
                ? "bg-primary/8 border-primary/25 shadow-sm"
                : "bg-primary/5 border-primary/10"
            }`}
          >
            <div className="mt-0.5">
              {nudgeIcons[nudge.type] || <Sparkles className="h-4 w-4 text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{nudge.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{nudge.content}</p>
              {isConnection && nudge.related_item_ids?.length > 0 && (
                <button
                  onClick={() => router.push(`/?highlight=${nudge.related_item_ids[0]}`)}
                  className="inline-flex items-center gap-1 mt-2 text-ui-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  보기
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
            <button
              onClick={() => dismiss(nudge.id)}
              className="text-muted-foreground/60 hover:text-foreground p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
