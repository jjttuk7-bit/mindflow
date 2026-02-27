"use client"

import { useStore } from "@/lib/store"
import { useTheme } from "@/hooks/use-theme"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ContentType } from "@/lib/supabase/types"
import { FileText, Link, Image, Mic, Layers, Sun, Moon } from "lucide-react"

const filters: {
  label: string
  value: ContentType | "all"
  icon: React.ReactNode
  color: string
}[] = [
  { label: "All", value: "all", icon: <Layers className="h-4 w-4" />, color: "text-warm-600" },
  { label: "Ideas", value: "text", icon: <FileText className="h-4 w-4" />, color: "text-terracotta" },
  { label: "Links", value: "link", icon: <Link className="h-4 w-4" />, color: "text-sage" },
  { label: "Images", value: "image", icon: <Image className="h-4 w-4" />, color: "text-dusty-rose" },
  { label: "Voice", value: "voice", icon: <Mic className="h-4 w-4" />, color: "text-amber-accent" },
]

export function Sidebar() {
  const { tags, items, activeFilter, setActiveFilter, activeTag, setActiveTag } =
    useStore()
  const { dark, toggle } = useTheme()

  const tagCounts = tags.map((tag) => ({
    ...tag,
    count: items.filter((item) =>
      item.tags?.some((t) => t.name === tag.name)
    ).length,
  }))

  return (
    <aside className="w-64 border-r border-border/60 bg-sidebar flex flex-col h-screen">
      {/* Brand */}
      <div className="px-6 pt-7 pb-5">
        <h1 className="font-display text-2xl tracking-tight text-foreground">
          Mindflow
        </h1>
        <p className="text-[11px] tracking-[0.15em] uppercase text-muted-foreground mt-1 font-medium">
          Personal Knowledge
        </p>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mx-4" />

      <ScrollArea className="flex-1 py-5">
        {/* Tags */}
        <div className="px-4">
          <p className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground/70 px-2 mb-3">
            Collections
          </p>
          {tagCounts.length === 0 && (
            <p className="text-xs text-muted-foreground/50 px-2 italic">
              Tags appear here as AI organizes your thoughts
            </p>
          )}
          <div className="space-y-0.5">
            {tagCounts.map((tag) => (
              <button
                key={tag.id}
                onClick={() =>
                  setActiveTag(activeTag === tag.name ? null : tag.name)
                }
                className={`group w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                  activeTag === tag.name
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground/70 hover:bg-accent hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                    activeTag === tag.name ? "bg-primary" : "bg-warm-300 group-hover:bg-warm-400"
                  } transition-colors`} />
                  {tag.name}
                </span>
                <span className={`text-[11px] tabular-nums ${
                  activeTag === tag.name
                    ? "text-primary/70"
                    : "text-muted-foreground/50"
                }`}>
                  {tag.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent mx-6 my-5" />

        {/* Filters */}
        <div className="px-4">
          <p className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground/70 px-2 mb-3">
            Type
          </p>
          <div className="space-y-0.5">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                  activeFilter === f.value
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground/70 hover:bg-accent hover:text-foreground"
                }`}
              >
                <span className={activeFilter === f.value ? "text-primary" : f.color}>
                  {f.icon}
                </span>
                <span>{f.label}</span>
              </button>
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border/40 flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground/40 tracking-wide">
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Ctrl+K</kbd>
          <span className="ml-2">to search</span>
        </p>
        <button
          onClick={toggle}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-all duration-200"
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  )
}
