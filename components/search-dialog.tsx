"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useStore } from "@/lib/store"
import { Badge } from "@/components/ui/badge"
import { FileText, Link, Image, Mic, Search } from "lucide-react"

const typeIcons: Record<string, React.ReactNode> = {
  text: <FileText className="h-3.5 w-3.5 text-terracotta" />,
  link: <Link className="h-3.5 w-3.5 text-sage" />,
  image: <Image className="h-3.5 w-3.5 text-dusty-rose" />,
  voice: <Mic className="h-3.5 w-3.5 text-amber-accent" />,
}

export function SearchDialog() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
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

  const filtered = query.trim()
    ? items.filter((item) =>
        item.content.toLowerCase().includes(query.toLowerCase())
      )
    : []

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 rounded-xl overflow-hidden border-border/60 shadow-[0_8px_40px_-12px_oklch(0.5_0.05_55/0.15)]">
        <DialogHeader className="p-0">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <div className="flex items-center gap-3 px-5 border-b border-border/40">
            <Search className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            <input
              placeholder="Search your thoughts..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent py-4 text-[15px] focus:outline-none placeholder:text-muted-foreground/40 placeholder:italic"
              autoFocus
            />
            <kbd className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground/50">
              ESC
            </kbd>
          </div>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto">
          {query.trim() && filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground/50 italic">
                No thoughts matched your search
              </p>
            </div>
          )}
          {filtered.map((item) => (
            <button
              key={item.id}
              className="w-full flex items-start gap-3.5 px-5 py-3.5 hover:bg-accent/50 transition-colors duration-150 text-left border-b border-border/20 last:border-0"
              onClick={() => setOpen(false)}
            >
              <div className="mt-0.5">{typeIcons[item.type]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-relaxed truncate text-foreground/80">
                  {item.content}
                </p>
                <div className="flex gap-1.5 mt-1.5">
                  {item.tags?.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="text-[10px] tracking-wide px-1.5 py-0 rounded font-medium bg-muted/70 text-muted-foreground/60 border-0"
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
