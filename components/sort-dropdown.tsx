"use client"

import { useStore, SortBy } from "@/lib/store"
import { ArrowUpDown, Clock, CalendarClock, Layers } from "lucide-react"
import { useState, useRef, useEffect } from "react"

const sortOptions: { value: SortBy; label: string; icon: React.ReactNode }[] = [
  { value: "newest", label: "Newest first", icon: <Clock className="h-3.5 w-3.5" /> },
  { value: "oldest", label: "Oldest first", icon: <CalendarClock className="h-3.5 w-3.5" /> },
  { value: "type", label: "By type", icon: <Layers className="h-3.5 w-3.5" /> },
]

export function SortDropdown() {
  const { sortBy, setSortBy } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  const current = sortOptions.find((o) => o.value === sortBy) ?? sortOptions[0]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        <ArrowUpDown className="h-3 w-3" />
        {current.label}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-border/60 bg-popover shadow-lg z-50 py-1">
          {sortOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setSortBy(opt.value); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                sortBy === opt.value
                  ? "text-primary bg-primary/5 font-medium"
                  : "text-foreground/70 hover:bg-accent"
              }`}
            >
              <span className={sortBy === opt.value ? "text-primary" : "text-muted-foreground/50"}>
                {opt.icon}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
