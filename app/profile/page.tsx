"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { FileText, Link, Image, Mic, Sparkles } from "lucide-react"

const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  text: { icon: <FileText className="h-3.5 w-3.5" />, color: "text-terracotta bg-terracotta/8" },
  link: { icon: <Link className="h-3.5 w-3.5" />, color: "text-sage bg-sage/8" },
  image: { icon: <Image className="h-3.5 w-3.5" />, color: "text-dusty-rose bg-dusty-rose/8" },
  voice: { icon: <Mic className="h-3.5 w-3.5" />, color: "text-amber-accent bg-amber-accent/8" },
}

interface SharedItem {
  id: string
  type: string
  content: string
  summary?: string
  metadata: Record<string, unknown>
  created_at: string
  tags?: { id: string; name: string }[]
}

export default function ProfilePage() {
  const [items, setItems] = useState<SharedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTag, setFilterTag] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setItems(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Collect all unique tags
  const allTags = Array.from(
    new Set(items.flatMap((i) => i.tags?.map((t) => t.name) ?? []))
  ).sort()

  const filtered = filterTag
    ? items.filter((i) => i.tags?.some((t) => t.name === filterTag))
    : items

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 px-6 py-8">
        <div className="max-w-4xl mx-auto text-center space-y-2">
          <h1 className="font-display text-3xl tracking-tight text-foreground">
            Mindflow
          </h1>
          <p className="text-sm text-muted-foreground/60">
            A curated collection of shared thoughts
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-8">
            <button
              onClick={() => setFilterTag(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                !filterTag
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground/60 hover:bg-muted"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterTag === tag
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground/60 hover:bg-muted"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Sparkles className="h-6 w-6 text-muted-foreground/30 animate-pulse" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-2">
            <Sparkles className="h-6 w-6 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground/50">No shared thoughts yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => {
              const config = typeConfig[item.type] ?? typeConfig.text
              const date = new Date(item.created_at).toLocaleDateString()

              return (
                <article
                  key={item.id}
                  className="rounded-xl border border-border/40 bg-card p-4 space-y-3 hover:shadow-[0_2px_16px_-4px_oklch(0.5_0.05_55/0.08)] hover:border-border transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${config.color} shrink-0`}>
                      {config.icon}
                    </div>
                    <span className="text-[10px] text-muted-foreground/40 ml-auto">{date}</span>
                  </div>

                  {item.type === "image" && item.metadata && "image_url" in item.metadata && (
                    <img
                      src={item.metadata.image_url as string}
                      alt=""
                      className="rounded-lg w-full h-32 object-cover"
                    />
                  )}

                  <p className="text-sm leading-relaxed text-foreground/80 line-clamp-4">
                    {item.summary || item.content}
                  </p>

                  {item.tags && item.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {item.tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className="text-[9px] tracking-wide px-1.5 py-0 rounded font-medium bg-muted/70 text-muted-foreground/60 border-0"
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
