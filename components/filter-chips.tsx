"use client"

import { useStore } from "@/lib/store"
import { ContentType } from "@/lib/supabase/types"
import { Layers, FileText, Link, Image, Mic } from "lucide-react"

const filters: { value: ContentType | "all"; icon: React.ReactNode; label: string }[] = [
  { value: "all", icon: <Layers className="h-3.5 w-3.5" />, label: "All" },
  { value: "text", icon: <FileText className="h-3.5 w-3.5" />, label: "Ideas" },
  { value: "link", icon: <Link className="h-3.5 w-3.5" />, label: "Links" },
  { value: "image", icon: <Image className="h-3.5 w-3.5" />, label: "Images" },
  { value: "voice", icon: <Mic className="h-3.5 w-3.5" />, label: "Voice" },
]

export function FilterChips() {
  const { activeFilter, setActiveFilter, setSmartFolder } = useStore()

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-2 md:hidden">
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => { setActiveFilter(f.value); setSmartFolder(null) }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
            activeFilter === f.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted/60 text-muted-foreground hover:bg-muted"
          }`}
        >
          {f.icon}
          {f.label}
        </button>
      ))}
    </div>
  )
}
