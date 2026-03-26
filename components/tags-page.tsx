"use client"

import { useEffect, useState } from "react"
import { Tag, Sparkles, Lightbulb, Loader2 } from "lucide-react"

interface TagItem {
  id: string
  name: string
  item_count: number
}

interface Interest {
  area: string
  summary: string
}

interface Gap {
  area: string
  reason: string
}

export function TagsPage() {
  const [tags, setTags] = useState<TagItem[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [interests, setInterests] = useState<Interest[]>([])
  const [gaps, setGaps] = useState<Gap[]>([])
  const [analyzed, setAnalyzed] = useState(false)

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((data) => {
        setTags(Array.isArray(data) ? data.sort((a: TagItem, b: TagItem) => b.item_count - a.item_count) : [])
        setLoading(false)
      })
  }, [])

  async function analyze() {
    setAnalyzing(true)
    const res = await fetch("/api/ai/tag-insights", { method: "POST" })
    const data = await res.json()
    setInterests(data.interests || [])
    setGaps(data.gaps || [])
    setAnalyzed(true)
    setAnalyzing(false)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-display font-semibold tracking-tight">Tags</h1>
        <p className="text-sm text-muted-foreground mt-1">저장된 콘텐츠의 태그를 확인하세요</p>
      </div>

      {/* 태그 목록 */}
      <section>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            불러오는 중...
          </div>
        ) : tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 태그가 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm text-foreground/80 hover:bg-accent transition-colors cursor-default"
              >
                <Tag className="h-3 w-3 text-muted-foreground/50" />
                {tag.name}
                <span className="text-xs text-muted-foreground/60">{tag.item_count}</span>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* AI 인사이트 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">AI 인사이트</h2>
          {!analyzed && (
            <button
              onClick={analyze}
              disabled={analyzing || loading || tags.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {analyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {analyzing ? "분석 중..." : "내 태그 분석하기"}
            </button>
          )}
        </div>

        {analyzed && (
          <div className="space-y-4">
            {interests.length > 0 && (
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-primary" />
                  관심 영역
                </div>
                <div className="space-y-2">
                  {interests.map((item, i) => (
                    <div key={i} className="space-y-0.5">
                      <p className="text-sm font-medium">{item.area}</p>
                      <p className="text-xs text-muted-foreground">{item.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {gaps.length > 0 && (
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  탐색해볼 영역
                </div>
                <div className="space-y-2">
                  {gaps.map((item, i) => (
                    <div key={i} className="space-y-0.5">
                      <p className="text-sm font-medium">{item.area}</p>
                      <p className="text-xs text-muted-foreground">{item.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={analyze}
              disabled={analyzing}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              다시 분석하기
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
