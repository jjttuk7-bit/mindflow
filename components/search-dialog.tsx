"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useStore } from "@/lib/store"
import { Badge } from "@/components/ui/badge"
import { FileText, Link, Image, Mic } from "lucide-react"

const typeIcons: Record<string, React.ReactNode> = {
  text: <FileText className="h-3.5 w-3.5 text-blue-500" />,
  link: <Link className="h-3.5 w-3.5 text-green-500" />,
  image: <Image className="h-3.5 w-3.5 text-purple-500" />,
  voice: <Mic className="h-3.5 w-3.5 text-orange-500" />,
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
      <DialogContent className="sm:max-w-lg p-0 gap-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <Input
            placeholder="Search your thoughts... (Ctrl+K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 text-base"
            autoFocus
          />
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto">
          {query.trim() && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No results found
            </p>
          )}
          {filtered.map((item) => (
            <button
              key={item.id}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
              onClick={() => setOpen(false)}
            >
              <div className="mt-0.5">{typeIcons[item.type]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{item.content}</p>
                <div className="flex gap-1 mt-1">
                  {item.tags?.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0"
                    >
                      #{tag.name}
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
