"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useStore } from "@/lib/store"
import { Badge } from "@/components/ui/badge"
import { Item } from "@/lib/supabase/types"
import { FileText, Link, Image, Mic, Search, Sparkles, Loader2 } from "lucide-react"

const typeIcons: Record<string, React.ReactNode> = {
  text: <FileText className="h-3.5 w-3.5 text-terracotta" />,
  link: <Link className="h-3.5 w-3.5 text-sage" />,
  image: <Image className="h-3.5 w-3.5 text-dusty-rose" />,
  voice: <Mic className="h-3.5 w-3.5 text-amber-accent" />,
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const parts = text.split(new RegExp(`(${escaped})`, "i"))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-primary/20 text-foreground rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

export function SearchDialog() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<(Item & { similarity?: number })[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [mode, setMode] = useState<"keyword" | "semantic">("keyword")
  const { items } = useStore()

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

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery("")
      setResults([])
      setMode("keyword")
    }
  }, [open])

  // Keyword search (instant, client-side)
  const keywordResults = query.trim()
    ? items.filter((item) =>
        item.content.toLowerCase().includes(query.toLowerCase()) ||
        item.summary?.toLowerCase().includes(query.toLowerCase())
      )
    : []

  // Semantic search (debounced, server-side)
  const semanticSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setIsSearching(true)
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, limit: 10 }),
      })
      if (res.ok) {
        const data = await res.json()
        setResults(data)
      }
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounce semantic search
  useEffect(() => {
    if (mode !== "semantic" || !query.trim()) return
    const timer = setTimeout(() => semanticSearch(query), 500)
    return () => clearTimeout(timer)
  }, [query, mode, semanticSearch])

  const displayResults = mode === "keyword" ? keywordResults : results

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 rounded-xl overflow-hidden border-border/60 shadow-[0_8px_40px_-12px_oklch(0.5_0.05_55/0.15)]">
        <DialogHeader className="p-0">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <div className="flex items-center gap-3 px-5 border-b border-border/40">
            <Search className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            <input
              placeholder={mode === "semantic" ? "저장된 내용에 대해 물어보세요..." : "생각을 검색하세요..."}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent py-4 text-[15px] focus:outline-none placeholder:text-muted-foreground/40 placeholder:italic"
              autoFocus
            />
            {isSearching && <Loader2 className="h-4 w-4 text-muted-foreground/40 animate-spin" />}
            <kbd className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground/50">
              ESC
            </kbd>
          </div>
          {/* Mode toggle */}
          <div className="flex gap-1 px-5 py-2 border-b border-border/20">
            <button
              onClick={() => setMode("keyword")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                mode === "keyword"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground/50 hover:text-muted-foreground"
              }`}
            >
              <Search className="h-3 w-3" />
              Keyword
            </button>
            <button
              onClick={() => { setMode("semantic"); setResults([]) }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                mode === "semantic"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground/50 hover:text-muted-foreground"
              }`}
            >
              <Sparkles className="h-3 w-3" />
              Semantic
            </button>
          </div>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto">
          {query.trim() && displayResults.length === 0 && !isSearching && (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground/50 italic">
                {mode === "semantic"
                  ? "의미적으로 유사한 기록을 찾지 못했어요"
                  : "검색 결과가 없어요"}
              </p>
            </div>
          )}
          {displayResults.map((item) => (
            <button
              key={item.id}
              className="w-full flex items-start gap-3.5 px-5 py-3.5 hover:bg-accent/50 transition-colors duration-150 text-left border-b border-border/20 last:border-0"
              onClick={() => setOpen(false)}
            >
              <div className="mt-0.5">{typeIcons[item.type]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-relaxed truncate text-foreground/80">
                  {mode === "keyword"
                    ? highlightMatch(item.summary || item.content, query)
                    : item.summary || item.content}
                </p>
                <div className="flex gap-1.5 mt-1.5 items-center">
                  {item.tags?.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="text-[10px] tracking-wide px-1.5 py-0 rounded font-medium bg-muted/70 text-muted-foreground/60 border-0"
                    >
                      {tag.name}
                    </Badge>
                  ))}
                  {"similarity" in item && typeof item.similarity === "number" && (
                    <span className="text-[10px] text-primary/50 ml-auto tabular-nums">
                      {Math.round(Number(item.similarity) * 100)}% 일치
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
