"use client"

import { useStore } from "@/lib/store"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ContentType } from "@/lib/supabase/types"
import { FileText, Link, Image, Mic, Layers } from "lucide-react"

const filters: {
  label: string
  value: ContentType | "all"
  icon: React.ReactNode
}[] = [
  { label: "All", value: "all", icon: <Layers className="h-4 w-4" /> },
  { label: "Ideas", value: "text", icon: <FileText className="h-4 w-4" /> },
  { label: "Links", value: "link", icon: <Link className="h-4 w-4" /> },
  { label: "Images", value: "image", icon: <Image className="h-4 w-4" /> },
  { label: "Voice", value: "voice", icon: <Mic className="h-4 w-4" /> },
]

export function Sidebar() {
  const { tags, items, activeFilter, setActiveFilter, activeTag, setActiveTag } =
    useStore()

  const tagCounts = tags.map((tag) => ({
    ...tag,
    count: items.filter((item) =>
      item.tags?.some((t) => t.name === tag.name)
    ).length,
  }))

  return (
    <aside className="w-60 border-r bg-muted/30 flex flex-col h-screen">
      <div className="p-4">
        <h1 className="text-lg font-semibold tracking-tight">Mindflow</h1>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 mb-2">
            Tags
          </p>
          {tagCounts.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 italic">
              No tags yet
            </p>
          )}
          {tagCounts.map((tag) => (
            <button
              key={tag.id}
              onClick={() =>
                setActiveTag(activeTag === tag.name ? null : tag.name)
              }
              className={`w-full flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors ${
                activeTag === tag.name
                  ? "bg-accent text-accent-foreground"
                  : ""
              }`}
            >
              <span>#{tag.name}</span>
              <Badge variant="secondary" className="text-xs">
                {tag.count}
              </Badge>
            </button>
          ))}
        </div>
        <Separator className="my-4" />
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 mb-2">
            Filter
          </p>
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors ${
                activeFilter === f.value
                  ? "bg-accent text-accent-foreground"
                  : ""
              }`}
            >
              {f.icon}
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </aside>
  )
}
