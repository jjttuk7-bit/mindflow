"use client"

import { useState, useEffect } from "react"
import { Ghost, Archive, Trash2, BookOpen, Loader2, PartyPopper, X } from "lucide-react"

interface CleanupItem {
  id: string
  type: string
  preview: string
  action: "archive" | "delete" | "revisit"
  reason: string
}

interface CleanupData {
  items: CleanupItem[]
  summary: string
}

const ACTION_CONFIG = {
  archive: {
    label: "아카이브",
    icon: Archive,
    color: "text-sage",
    bg: "bg-sage/10",
    border: "border-sage/20",
  },
  delete: {
    label: "삭제",
    icon: Trash2,
    color: "text-dusty-rose",
    bg: "bg-dusty-rose/10",
    border: "border-dusty-rose/20",
  },
  revisit: {
    label: "재방문",
    icon: BookOpen,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
  },
}

export function CleanupGuide({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<CleanupData | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<Set<string>>(new Set())
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/ai/cleanup")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed"))))
      .then((res) => setData(res))
      .catch(() => setError("정리 추천을 불러올 수 없었어요"))
      .finally(() => setLoading(false))
  }, [])

  async function handleAction(item: CleanupItem) {
    if (processing.has(item.id) || completed.has(item.id)) return

    setProcessing((prev) => new Set(prev).add(item.id))

    try {
      if (item.action === "archive") {
        await fetch("/api/items", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, is_archived: true }),
        })
      } else if (item.action === "delete") {
        await fetch(`/api/items?id=${item.id}`, { method: "DELETE" })
      }
      // "revisit" just marks as done in UI

      setCompleted((prev) => new Set(prev).add(item.id))
    } catch {
      // silently fail
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  async function handleBulkAction(action: "archive" | "delete") {
    if (!data) return
    const items = data.items.filter(
      (i) => i.action === action && !completed.has(i.id)
    )
    for (const item of items) {
      await handleAction(item)
    }
  }

  const completedCount = completed.size
  const totalCount = data?.items.length || 0
  const allDone = totalCount > 0 && completedCount === totalCount

  // Group items by action
  const grouped = data?.items.reduce(
    (acc, item) => {
      acc[item.action] = acc[item.action] || []
      acc[item.action].push(item)
      return acc
    },
    {} as Record<string, CleanupItem[]>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl mx-4">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border/60 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Ghost className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-base font-semibold">AI 정리 가이드</h2>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">AI가 항목을 분석하고 있어요...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          )}

          {allDone && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 animate-in fade-in duration-500">
              <PartyPopper className="h-10 w-10 text-primary" />
              <p className="text-lg font-semibold">{completedCount}개 항목을 정리했어요!</p>
              <p className="text-sm text-muted-foreground">깔끔하게 정리 완료!</p>
            </div>
          )}

          {data && !allDone && (
            <>
              {/* Summary */}
              <p className="text-sm text-foreground/70 mb-4">{data.summary}</p>

              {/* Progress */}
              {completedCount > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>진행률</span>
                    <span>{completedCount}/{totalCount}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(completedCount / totalCount) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Grouped items */}
              {(["archive", "delete", "revisit"] as const).map((action) => {
                const items = grouped?.[action]
                if (!items || items.length === 0) return null
                const config = ACTION_CONFIG[action]
                const Icon = config.icon
                const pendingItems = items.filter((i) => !completed.has(i.id))

                return (
                  <div key={action} className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className={`text-xs font-medium flex items-center gap-1.5 ${config.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {config.label} 추천 ({items.length}개)
                      </p>
                      {action !== "revisit" && pendingItems.length > 1 && (
                        <button
                          onClick={() => handleBulkAction(action)}
                          className={`text-[11px] px-2 py-0.5 rounded-full ${config.bg} ${config.color} hover:opacity-80 transition-opacity`}
                        >
                          전체 {config.label}
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {items.map((item) => {
                        const isDone = completed.has(item.id)
                        const isProcessing = processing.has(item.id)

                        return (
                          <div
                            key={item.id}
                            className={`rounded-lg border p-3 transition-all ${
                              isDone
                                ? "opacity-40 border-border/30"
                                : `${config.border} ${config.bg}`
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-foreground/80 line-clamp-1">
                                  {item.preview}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {item.reason}
                                </p>
                              </div>
                              {!isDone && (
                                <button
                                  onClick={() => handleAction(item)}
                                  disabled={isProcessing}
                                  className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${config.bg} ${config.color} hover:opacity-80 disabled:opacity-50`}
                                >
                                  {isProcessing ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    config.label
                                  )}
                                </button>
                              )}
                              {isDone && (
                                <span className="text-xs text-muted-foreground">완료</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
