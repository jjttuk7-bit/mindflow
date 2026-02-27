"use client"

import { useState, useRef, useEffect } from "react"
import { useStore } from "@/lib/store"
import { Download, FileText, Braces } from "lucide-react"

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function itemsToMarkdown(items: ReturnType<typeof useStore.getState>["items"]): string {
  const lines: string[] = [
    "# Mindflow Export",
    "",
    `> Exported on ${new Date().toLocaleDateString()}`,
    "",
    "---",
    "",
  ]

  for (const item of items) {
    if (item.is_archived) continue
    const tags = item.tags?.map((t) => `\`${t.name}\``).join(" ") ?? ""
    const date = new Date(item.created_at).toLocaleString()
    const typeLabel = item.type.charAt(0).toUpperCase() + item.type.slice(1)

    lines.push(`## ${item.summary || item.content.slice(0, 60)}`)
    lines.push("")
    lines.push(`**Type:** ${typeLabel} | **Date:** ${date}`)
    if (tags) lines.push(`**Tags:** ${tags}`)
    lines.push("")
    lines.push(item.content)
    lines.push("")
    lines.push("---")
    lines.push("")
  }

  return lines.join("\n")
}

function itemsToJson(items: ReturnType<typeof useStore.getState>["items"]): string {
  const exportData = items
    .filter((i) => !i.is_archived)
    .map((item) => ({
      id: item.id,
      type: item.type,
      content: item.content,
      summary: item.summary,
      tags: item.tags?.map((t) => t.name) ?? [],
      created_at: item.created_at,
      metadata: item.metadata,
    }))

  return JSON.stringify(exportData, null, 2)
}

export function ExportMenu() {
  const { items } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  function handleExportMarkdown() {
    const md = itemsToMarkdown(items)
    downloadFile(md, `mindflow-export-${Date.now()}.md`, "text/markdown")
    setOpen(false)
  }

  function handleExportJson() {
    const json = itemsToJson(items)
    downloadFile(json, `mindflow-export-${Date.now()}.json`, "application/json")
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-all duration-200"
        aria-label="Export data"
      >
        <Download className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-40 rounded-lg border border-border/60 bg-popover shadow-lg z-50 py-1">
          <button
            onClick={handleExportMarkdown}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground/70 hover:bg-accent transition-colors"
          >
            <FileText className="h-3.5 w-3.5 text-muted-foreground/50" />
            Markdown (.md)
          </button>
          <button
            onClick={handleExportJson}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground/70 hover:bg-accent transition-colors"
          >
            <Braces className="h-3.5 w-3.5 text-muted-foreground/50" />
            JSON (.json)
          </button>
        </div>
      )}
    </div>
  )
}
