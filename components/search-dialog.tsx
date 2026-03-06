"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useStore } from "@/lib/store"
import { Badge } from "@/components/ui/badge"
import { Item } from "@/lib/supabase/types"
import { FileText, Link, Image, Mic, Search, Sparkles, Loader2, Clock, SlidersHorizontal, X } from "lucide-react"
import { ContentType } from "@/lib/supabase/types"

const typeIcons: Record<string, React.ReactNode> = {
  text: <FileText className="h-3.5 w-3.5 text-terracotta" />,
  link: <Link className="h-3.5 w-3.5 text-sage" />,
  image: <Image className="h-3.5 w-3.5 text-dusty-rose" />,
  voice: <Mic className="h-3.5 w-3.5 text-amber-accent" />,
}

/** Parse natural language time expressions and return a date cutoff */
function parseTimeCutoff(query: string): { cutoff: Date | null; cleanQuery: string } {
  const now = new Date()
  const patterns: [RegExp, () => Date][] = [
    [/오늘/g, () => { const d = new Date(now); d.setHours(0, 0, 0, 0); return d }],
    [/어제/g, () => { const d = new Date(now); d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0); return d }],
    [/그저께|그제/g, () => { const d = new Date(now); d.setDate(d.getDate() - 2); d.setHours(0, 0, 0, 0); return d }],
    [/이번\s*주|이번주|금주/g, () => { const d = new Date(now); d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d }],
    [/지난\s*주|지난주|저번\s*주/g, () => { const d = new Date(now); d.setDate(d.getDate() - 7); return d }],
    [/이번\s*달|이번달/g, () => { const d = new Date(now); d.setDate(1); d.setHours(0, 0, 0, 0); return d }],
    [/지난\s*달|지난달|저번\s*달/g, () => { const d = new Date(now); d.setMonth(d.getMonth() - 1); return d }],
    [/최근|요즘/g, () => { const d = new Date(now); d.setDate(d.getDate() - 14); return d }],
    [/(\d+)\s*일\s*전/g, () => { const m = query.match(/(\d+)\s*일\s*전/); const d = new Date(now); d.setDate(d.getDate() - (m ? parseInt(m[1]) : 7)); return d }],
  ]

  let cutoff: Date | null = null
  let cleanQuery = query

  for (const [pattern, getDate] of patterns) {
    if (pattern.test(query)) {
      cutoff = getDate()
      cleanQuery = query.replace(pattern, "").trim()
      break
    }
  }

  // Remove filler words from cleaned query
  cleanQuery = cleanQuery
    .replace(/에?\s*(저장|봤|본|읽은|공유|찾은)\s*(한|했던|된|든)?\s*(것|거|링크|메모|글|내용)?/g, "")
    .replace(/관련\s*(된)?/g, "")
    .replace(/\s+/g, " ")
    .trim()

  return { cutoff, cleanQuery }
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const words = query.split(/\s+/).filter(w => w.length > 1)
  if (words.length === 0) return text
  const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")
  const parts = text.split(new RegExp(`(${escaped})`, "i"))
  return parts.map((part, i) =>
    words.some(w => part.toLowerCase() === w.toLowerCase()) ? (
      <mark key={i} className="bg-primary/20 text-foreground rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

function timeAgo(dateStr: string) {
  const date = new Date(dateStr)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "방금"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}월 ${day}일`
}

const SEARCH_HISTORY_KEY = "dotline_search_history"
const MAX_HISTORY = 8

function getSearchHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || "[]")
  } catch {
    return []
  }
}

function saveSearchHistory(query: string) {
  const trimmed = query.trim()
  if (!trimmed || trimmed.length < 2) return
  const history = getSearchHistory().filter((h) => h !== trimmed)
  history.unshift(trimmed)
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)))
}

function clearSearchHistory() {
  localStorage.removeItem(SEARCH_HISTORY_KEY)
}

export function SearchDialog() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [semanticResults, setSemanticResults] = useState<(Item & { similarity?: number })[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [timeCutoff, setTimeCutoff] = useState<Date | null>(null)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const [filterType, setFilterType] = useState<ContentType | null>(null)
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [sortByDate, setSortByDate] = useState(false)
  const { items, tags: allTags, setJustSavedId } = useStore()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  // Load history on open, reset on close
  useEffect(() => {
    if (open) {
      setSearchHistory(getSearchHistory())
    } else {
      setQuery("")
      setSemanticResults([])
      setTimeCutoff(null)
      setFilterType(null)
      setFilterTag(null)
      setShowFilters(false)
      setSortByDate(false)
    }
  }, [open])

  // Parse time from query
  useEffect(() => {
    const { cutoff } = parseTimeCutoff(query)
    setTimeCutoff(cutoff)
  }, [query])

  // Keyword search (instant, client-side)
  const keywordSearch = useCallback((q: string): Item[] => {
    if (!q.trim()) return []
    const { cleanQuery, cutoff } = parseTimeCutoff(q)
    const words = (cleanQuery || q).toLowerCase().split(/\s+/).filter(w => w.length > 0)
    if (words.length === 0 && cutoff) {
      // Time-only query: return recent items from that period
      return items
        .filter(i => !i.deleted_at && new Date(i.created_at) >= cutoff)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 15)
    }
    return items.filter((item) => {
      if (item.deleted_at) return false
      if (cutoff && new Date(item.created_at) < cutoff) return false
      const searchable = [
        item.content,
        item.summary,
        ...(item.tags?.map(t => t.name) || []),
        (item.metadata as Record<string, string>)?.og_title,
        (item.metadata as Record<string, string>)?.og_description,
      ].filter(Boolean).join(" ").toLowerCase()
      return words.every(w => searchable.includes(w))
    }).slice(0, 15)
  }, [items])

  // Semantic search (debounced, server-side)
  const semanticSearch = useCallback(async (q: string) => {
    const { cleanQuery } = parseTimeCutoff(q)
    const searchQuery = cleanQuery || q
    if (!searchQuery.trim() || searchQuery.length < 2) { setSemanticResults([]); return }
    setIsSearching(true)
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, limit: 10 }),
      })
      if (res.ok) {
        let data = await res.json()
        // Apply time filter to semantic results too
        const { cutoff } = parseTimeCutoff(q)
        if (cutoff) {
          data = data.filter((item: Item) => new Date(item.created_at) >= cutoff)
        }
        setSemanticResults(data)
      }
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounce semantic search
  useEffect(() => {
    if (!query.trim()) { setSemanticResults([]); return }
    const timer = setTimeout(() => semanticSearch(query), 600)
    return () => clearTimeout(timer)
  }, [query, semanticSearch])

  // Apply type/tag filters to results
  const applyFilters = (results: Item[]) => {
    return results.filter((item) => {
      if (filterType && item.type !== filterType) return false
      if (filterTag && !item.tags?.some((t) => t.name === filterTag)) return false
      return true
    })
  }

  // Merge keyword + semantic results, deduplicate, rank
  const keywordResults = keywordSearch(query)
  const mergedResults = (() => {
    if (!query.trim() && !filterType && !filterTag) return []
    const seen = new Set<string>()
    const merged: (Item & { similarity?: number; matchType?: string })[] = []

    // If only filters active (no query), search all items
    const sourceItems = query.trim() ? keywordResults : items.filter((i) => !i.deleted_at)

    for (const item of sourceItems) {
      if (!seen.has(item.id)) {
        seen.add(item.id)
        merged.push({ ...item, matchType: "keyword" })
      }
    }

    // Then semantic matches
    if (query.trim()) {
      for (const item of semanticResults) {
        if (!seen.has(item.id)) {
          seen.add(item.id)
          merged.push({ ...item, matchType: "semantic" })
        }
      }
    }

    let filtered = applyFilters(merged)

    // Sort by date if toggled
    if (sortByDate) {
      filtered = filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    return filtered.slice(0, 20)
  })()

  function handleResultClick(item: Item) {
    if (query.trim()) saveSearchHistory(query)
    setJustSavedId(item.id)
    setOpen(false)
  }

  const defaultSuggestions = [
    "지난주에 저장한 링크",
    "커피 관련",
    "어제 메모",
    "react",
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 rounded-xl overflow-hidden border-border/60 shadow-[0_8px_40px_-12px_oklch(0.5_0.05_55/0.15)]">
        <DialogHeader className="p-0">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <div className="flex items-center gap-3 px-5 border-b border-border/40">
            <Search className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            <input
              ref={inputRef}
              placeholder="무엇이든 검색하세요... (예: 지난주 커피 관련 링크)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent py-4 text-[15px] focus:outline-none placeholder:text-muted-foreground/40"
              autoFocus
            />
            {isSearching && <Loader2 className="h-4 w-4 text-muted-foreground/40 animate-spin" />}
            <kbd className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground/50">
              ESC
            </kbd>
          </div>
          {/* Filter bar */}
          <div className="flex items-center gap-1.5 px-5 py-1.5 border-b border-border/20">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                showFilters || filterType || filterTag
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <SlidersHorizontal className="h-3 w-3" />
              필터
              {(filterType || filterTag) && (
                <span className="ml-0.5 px-1 py-0 rounded-full bg-primary text-primary-foreground text-[9px]">
                  {(filterType ? 1 : 0) + (filterTag ? 1 : 0)}
                </span>
              )}
            </button>
            {/* Active filter chips */}
            {filterType && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/70 text-[10px] font-medium text-muted-foreground">
                {typeIcons[filterType]}
                {filterType}
                <button onClick={() => setFilterType(null)} className="hover:text-foreground"><X className="h-2.5 w-2.5" /></button>
              </span>
            )}
            {filterTag && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/70 text-[10px] font-medium text-muted-foreground">
                #{filterTag}
                <button onClick={() => setFilterTag(null)} className="hover:text-foreground"><X className="h-2.5 w-2.5" /></button>
              </span>
            )}
            {timeCutoff && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-[10px] font-medium text-primary/70">
                <Clock className="h-2.5 w-2.5" />
                {timeCutoff.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} 이후
              </span>
            )}
            {/* Sort toggle */}
            <button
              onClick={() => setSortByDate(!sortByDate)}
              className={`ml-auto flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                sortByDate
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground/40 hover:text-muted-foreground"
              }`}
            >
              <Clock className="h-2.5 w-2.5" />
              {sortByDate ? "날짜순" : "관련순"}
            </button>
          </div>
          {/* Expandable filter panel */}
          {showFilters && (
            <div className="px-5 py-3 border-b border-border/20 bg-muted/20 space-y-3">
              {/* Type filter */}
              <div>
                <p className="text-[10px] text-muted-foreground/50 font-medium mb-1.5">타입</p>
                <div className="flex gap-1.5">
                  {(["text", "link", "image", "voice"] as ContentType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setFilterType(filterType === t ? null : t)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                        filterType === t
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-muted/50 text-muted-foreground/60 hover:bg-muted border border-transparent"
                      }`}
                    >
                      {typeIcons[t]}
                      {t === "text" ? "Idea" : t === "link" ? "Link" : t === "image" ? "Image" : "Voice"}
                    </button>
                  ))}
                </div>
              </div>
              {/* Tag filter */}
              {allTags.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground/50 font-medium mb-1.5">태그</p>
                  <div className="flex gap-1.5 flex-wrap max-h-20 overflow-y-auto">
                    {allTags.slice(0, 20).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setFilterTag(filterTag === t.name ? null : t.name)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                          filterTag === t.name
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "bg-muted/50 text-muted-foreground/60 hover:bg-muted border border-transparent"
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto">
          {/* Search history + Suggestions when empty */}
          {!query.trim() && !filterType && !filterTag && (
            <div className="px-5 py-4 space-y-3">
              {searchHistory.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] text-muted-foreground/40 font-medium">최근 검색</p>
                    <button
                      onClick={() => { clearSearchHistory(); setSearchHistory([]) }}
                      className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground transition-colors"
                    >
                      지우기
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {searchHistory.map((s) => (
                      <button
                        key={s}
                        onClick={() => { setQuery(s); inputRef.current?.focus() }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground/70 bg-muted/50 hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Clock className="h-2.5 w-2.5" />
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-[11px] text-muted-foreground/40 font-medium mb-2">검색 제안</p>
                <div className="flex flex-wrap gap-1.5">
                  {defaultSuggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setQuery(s); inputRef.current?.focus() }}
                      className="px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground/60 bg-muted/50 hover:bg-muted hover:text-foreground transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* No results */}
          {(query.trim() || filterType || filterTag) && mergedResults.length === 0 && !isSearching && (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground/50">
                검색 결과가 없어요
              </p>
              <p className="text-xs text-muted-foreground/30 mt-1">
                다른 표현으로 검색해보세요
              </p>
            </div>
          )}

          {/* Results */}
          {mergedResults.map((item) => (
            <button
              key={item.id}
              className="w-full flex items-start gap-3.5 px-5 py-3.5 hover:bg-accent/50 transition-colors duration-150 text-left border-b border-border/20 last:border-0"
              onClick={() => handleResultClick(item)}
            >
              <div className="mt-0.5">{typeIcons[item.type]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-relaxed line-clamp-2 text-foreground/80">
                  {highlightMatch(
                    item.summary || (item.metadata as Record<string, string>)?.og_title || item.content,
                    parseTimeCutoff(query).cleanQuery || query
                  )}
                </p>
                <div className="flex gap-1.5 mt-1.5 items-center">
                  {item.tags?.slice(0, 3).map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="text-[10px] tracking-wide px-1.5 py-0 rounded font-medium bg-muted/70 text-muted-foreground/60 border-0"
                    >
                      {tag.name}
                    </Badge>
                  ))}
                  <span className="text-[10px] text-muted-foreground/40 ml-auto tabular-nums flex items-center gap-1">
                    {item.matchType === "semantic" && (
                      <Sparkles className="h-2.5 w-2.5 text-primary/40" />
                    )}
                    {timeAgo(item.created_at)}
                  </span>
                </div>
              </div>
            </button>
          ))}

          {/* Semantic search status */}
          {query.trim() && keywordResults.length > 0 && isSearching && (
            <div className="flex items-center justify-center gap-1.5 py-3 text-[11px] text-muted-foreground/40">
              <Sparkles className="h-3 w-3 animate-pulse" />
              AI 의미 검색 중...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
