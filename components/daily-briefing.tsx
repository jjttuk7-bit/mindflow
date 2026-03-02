"use client"

import { useState, useEffect } from "react"
import { Sun, Moon, Cloud, CheckCircle2, AlertCircle, FileText, Link, Image, Mic, X, ChevronDown, ChevronUp } from "lucide-react"

const typeLabels: Record<string, string> = {
  text: "텍스트",
  link: "링크",
  image: "이미지",
  voice: "음성",
}

const typeIcons: Record<string, React.ReactNode> = {
  text: <FileText className="h-3 w-3" />,
  link: <Link className="h-3 w-3" />,
  image: <Image className="h-3 w-3" />,
  voice: <Mic className="h-3 w-3" />,
}

interface BriefingData {
  greeting: string
  yesterday: {
    total: number
    counts: Record<string, number>
    snippets: { type: string; text: string }[]
  }
  today: { total: number }
  todos: {
    pending: number
    overdue: number
    items: string[]
  }
  week: {
    total: number
    counts: Record<string, number>
  }
  totalItems: number
  streak?: {
    current: number
    longest: number
  }
}

export function DailyBriefing() {
  const [data, setData] = useState<BriefingData | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const dismissedAt = sessionStorage.getItem("briefing_dismissed")
    if (dismissedAt) {
      setDismissed(true)
      setLoading(false)
      return
    }

    fetch("/api/ai/briefing")
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res && !res.error) setData(res)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleDismiss() {
    setDismissed(true)
    sessionStorage.setItem("briefing_dismissed", Date.now().toString())
  }

  if (loading || dismissed || !data) return null

  const hour = new Date().getHours()
  const TimeIcon = hour < 12 ? Sun : hour < 18 ? Cloud : Moon

  const { yesterday, todos, week, totalItems, streak } = data

  return (
    <div className="relative rounded-xl border border-primary/15 bg-gradient-to-br from-primary/5 via-transparent to-amber-accent/5 px-5 py-4 animate-in fade-in slide-in-from-top-2 duration-500">
      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Greeting + Streak */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
          <TimeIcon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <span className="text-[13px] font-semibold text-foreground/90">
            {data.greeting}
          </span>
          <span className="text-[11px] text-muted-foreground/50 ml-2">
            총 {totalItems}개의 기억
          </span>
        </div>
        {streak && streak.current >= 2 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/10">
            <span className="text-sm">🔥</span>
            <span className="text-xs font-bold text-orange-500">{streak.current}일</span>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {/* Yesterday */}
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <p className="text-[10px] tracking-wide uppercase text-muted-foreground/50 mb-0.5">어제</p>
          <p className="text-lg font-bold text-foreground/80 leading-tight">
            {yesterday.total}
            <span className="text-[10px] font-normal text-muted-foreground/40 ml-0.5">개</span>
          </p>
        </div>

        {/* This week */}
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <p className="text-[10px] tracking-wide uppercase text-muted-foreground/50 mb-0.5">이번 주</p>
          <p className="text-lg font-bold text-foreground/80 leading-tight">
            {week.total}
            <span className="text-[10px] font-normal text-muted-foreground/40 ml-0.5">개</span>
          </p>
        </div>

        {/* Todos */}
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <p className="text-[10px] tracking-wide uppercase text-muted-foreground/50 mb-0.5">할 일</p>
          <p className="text-lg font-bold text-foreground/80 leading-tight">
            {todos.pending}
            <span className="text-[10px] font-normal text-muted-foreground/40 ml-0.5">개</span>
          </p>
        </div>
      </div>

      {/* Overdue warning */}
      {todos.overdue > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/8 px-3 py-1.5 mb-3">
          <AlertCircle className="h-3.5 w-3.5 text-destructive/70 shrink-0" />
          <span className="text-[11px] text-destructive/70">
            기한이 지난 할 일이 {todos.overdue}개 있어요
          </span>
        </div>
      )}

      {/* Expandable details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-muted-foreground/70 transition-colors"
      >
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {expanded ? "접기" : "자세히 보기"}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
          {/* Yesterday's type breakdown */}
          {yesterday.total > 0 && (
            <div>
              <p className="text-[10px] tracking-wide uppercase text-muted-foreground/50 mb-1.5">
                어제의 기록
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(yesterday.counts).map(([type, count]) => (
                  <span
                    key={type}
                    className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground/60"
                  >
                    {typeIcons[type]}
                    {typeLabels[type] || type} {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Yesterday's snippets */}
          {yesterday.snippets.length > 0 && (
            <div>
              <p className="text-[10px] tracking-wide uppercase text-muted-foreground/50 mb-1.5">
                어제 저장한 내용
              </p>
              <div className="space-y-1">
                {yesterday.snippets.map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 text-muted-foreground/40 shrink-0">
                      {typeIcons[s.type]}
                    </span>
                    <p className="text-[12px] text-foreground/60 line-clamp-1">{s.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending todos */}
          {todos.items.length > 0 && (
            <div>
              <p className="text-[10px] tracking-wide uppercase text-muted-foreground/50 mb-1.5">
                진행 중인 할 일
              </p>
              <div className="space-y-1">
                {todos.items.map((todo, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-3 w-3 mt-0.5 text-muted-foreground/30 shrink-0" />
                    <p className="text-[12px] text-foreground/60 line-clamp-1">{todo}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Week type breakdown */}
          {week.total > 0 && (
            <div>
              <p className="text-[10px] tracking-wide uppercase text-muted-foreground/50 mb-1.5">
                이번 주 타입별
              </p>
              <div className="flex gap-1">
                {Object.entries(week.counts).map(([type, count]) => {
                  const pct = Math.round((count / week.total) * 100)
                  return (
                    <div
                      key={type}
                      className="h-1.5 rounded-full bg-primary/30 first:rounded-l-full last:rounded-r-full"
                      style={{ width: `${pct}%`, minWidth: 8 }}
                      title={`${typeLabels[type] || type}: ${count} (${pct}%)`}
                    />
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                {Object.entries(week.counts).map(([type, count]) => (
                  <span key={type} className="text-[10px] text-muted-foreground/40">
                    {typeLabels[type] || type} {count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
