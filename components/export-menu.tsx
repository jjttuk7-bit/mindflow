"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useStore } from "@/lib/store"
import { Download, FileText, FileDown, Braces, Sparkles, Copy, Check, Loader2 } from "lucide-react"
import { downloadBlob } from "@/lib/chat-export"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

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
    "# DotLine Export",
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

async function itemsToDocx(items: ReturnType<typeof useStore.getState>["items"]): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle } = await import("docx")

  const children: InstanceType<typeof Paragraph>[] = []

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "DotLine Export", bold: true })],
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Exported: ${new Date().toLocaleString()}`,
          italics: true,
          color: "888888",
          size: 20,
        }),
      ],
      spacing: { after: 200 },
    })
  )

  children.push(
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" } },
      spacing: { after: 300 },
    })
  )

  for (const item of items) {
    if (item.is_archived) continue
    const tags = item.tags?.map((t) => t.name).join(", ") ?? ""
    const date = new Date(item.created_at).toLocaleString()
    const typeLabel = item.type.charAt(0).toUpperCase() + item.type.slice(1)

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: item.summary || item.content.slice(0, 60), bold: true })],
        spacing: { before: 240 },
      })
    )

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Type: ${typeLabel}`, bold: true, size: 20, color: "555555" }),
          new TextRun({ text: `  |  Date: ${date}`, size: 20, color: "888888" }),
        ],
      })
    )

    if (tags) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `Tags: ${tags}`, italics: true, size: 20, color: "666666" })],
        })
      )
    }

    const lines = item.content.split("\n")
    for (const line of lines) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line, size: 22 })],
          spacing: { after: 40 },
        })
      )
    }
  }

  const doc = new Document({ sections: [{ children }] })
  return Packer.toBlob(doc)
}

async function itemsToPdf(items: ReturnType<typeof useStore.getState>["items"]): Promise<Blob> {
  const html2pdf = (await import("html2pdf.js")).default

  const cardsHtml = items
    .filter((i) => !i.is_archived)
    .map((item) => {
      const tags = item.tags?.map((t) => t.name).join(", ") ?? ""
      const date = new Date(item.created_at).toLocaleString()
      const typeLabel = item.type.charAt(0).toUpperCase() + item.type.slice(1)
      const escapedContent = item.content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br/>")

      return `
        <div style="margin-bottom:16px;padding:12px 16px;border-radius:8px;background:#f8f9fa;border:1px solid #e9ecef;">
          <div style="font-size:15px;font-weight:bold;margin-bottom:4px;">${(item.summary || item.content.slice(0, 60)).replace(/</g, "&lt;")}</div>
          <div style="font-size:11px;color:#888;margin-bottom:8px;">
            ${typeLabel} | ${date}${tags ? ` | Tags: ${tags}` : ""}
          </div>
          <div style="font-size:13px;line-height:1.6;color:#222;">${escapedContent}</div>
        </div>`
    })
    .join("")

  const htmlContent = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:100%;padding:20px;">
      <h1 style="font-size:22px;margin-bottom:4px;">DotLine Export</h1>
      <p style="color:#888;font-size:12px;margin-bottom:16px;">Exported: ${new Date().toLocaleString()}</p>
      <hr style="border:none;border-top:1px solid #ddd;margin-bottom:20px;"/>
      ${cardsHtml}
    </div>`

  const container = document.createElement("div")
  container.innerHTML = htmlContent

  const blob: Blob = await html2pdf()
    .set({
      margin: [10, 10, 10, 10],
      filename: "export.pdf",
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(container)
    .outputPdf("blob")

  return blob
}

function AISummaryDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { items, activeFilter, activeTag, activeProject } = useStore()
  const [depth, setDepth] = useState<"brief" | "detailed">("brief")
  const [loading, setLoading] = useState(false)
  const [markdown, setMarkdown] = useState("")
  const [itemCount, setItemCount] = useState(0)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  // Filter items the same way the current view does
  const filteredItems = items.filter((item) => {
    if (item.is_archived) return false
    if (activeFilter !== "all" && item.type !== activeFilter) return false
    if (activeTag && !item.tags?.some((t) => t.name === activeTag)) return false
    if (activeProject && item.project_id !== activeProject) return false
    return true
  })

  const handleGenerate = useCallback(async () => {
    setLoading(true)
    setError("")
    setMarkdown("")

    try {
      const body: Record<string, unknown> = { depth }

      // Send item IDs of the current view
      if (filteredItems.length > 0) {
        body.item_ids = filteredItems.map((i) => i.id)
      }
      if (activeProject) {
        body.project_id = activeProject
      }
      if (activeTag) {
        body.tag = activeTag
      }

      const res = await fetch("/api/export/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to generate summary")
      }

      const data = await res.json()
      setMarkdown(data.markdown)
      setItemCount(data.item_count)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }, [depth, filteredItems, activeProject, activeTag])

  function handleCopy() {
    navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    downloadFile(markdown, `dotline-summary-${Date.now()}.md`, "text/markdown")
  }

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setMarkdown("")
      setError("")
      setLoading(false)
      setItemCount(0)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Summary
          </DialogTitle>
          <DialogDescription>
            Generate an AI-organized summary of your current view ({filteredItems.length} items)
          </DialogDescription>
        </DialogHeader>

        {/* Depth selection */}
        {!markdown && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground/80 mb-2">Summary depth</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDepth("brief")}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm border transition-all ${
                    depth === "brief"
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border/60 text-foreground/60 hover:bg-accent"
                  }`}
                >
                  Brief
                  <span className="block text-[11px] mt-0.5 opacity-70">Bullet-point summary</span>
                </button>
                <button
                  onClick={() => setDepth("detailed")}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm border transition-all ${
                    depth === "detailed"
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border/60 text-foreground/60 hover:bg-accent"
                  }`}
                >
                  Detailed
                  <span className="block text-[11px] mt-0.5 opacity-70">Structured document</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Scope: Current view</span>
              <span>{filteredItems.length} items</span>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/5 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading || filteredItems.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Summary
                </>
              )}
            </button>
          </div>
        )}

        {/* Result area */}
        {markdown && (
          <div className="flex flex-col gap-3 min-h-0 flex-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Summarized {itemCount} items</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-accent transition-colors"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-sage" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-accent transition-colors"
                >
                  <Download className="h-3 w-3" />
                  Download .md
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-border/60 bg-muted/30 p-4">
              <pre className="text-sm text-foreground/80 whitespace-pre-wrap font-[family-name:var(--font-body)] leading-relaxed">
                {markdown}
              </pre>
            </div>
            <button
              onClick={() => setMarkdown("")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors self-center"
            >
              Generate again
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function ExportMenu() {
  const { items } = useStore()
  const [open, setOpen] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
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
    downloadFile(md, `dotline-export-${Date.now()}.md`, "text/markdown")
    setOpen(false)
  }

  function handleExportJson() {
    const json = itemsToJson(items)
    downloadFile(json, `dotline-export-${Date.now()}.json`, "application/json")
    setOpen(false)
  }

  async function handleExportDocx() {
    setOpen(false)
    const blob = await itemsToDocx(items)
    downloadBlob(blob, `dotline-export-${Date.now()}.docx`)
  }

  async function handleExportPdf() {
    setOpen(false)
    const blob = await itemsToPdf(items)
    downloadBlob(blob, `dotline-export-${Date.now()}.pdf`)
  }

  function handleAISummary() {
    setOpen(false)
    setSummaryOpen(true)
  }

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-all duration-200"
          aria-label="Export data"
        >
          <Download className="h-4 w-4" />
        </button>
        {open && (
          <div className="absolute bottom-full left-0 mb-1 w-44 rounded-lg border border-border/60 bg-popover shadow-lg z-50 py-1">
            <button
              onClick={handleAISummary}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground/70 hover:bg-accent transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              AI Summary
            </button>
            <div className="h-px bg-border/40 mx-2 my-1" />
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
            <div className="h-px bg-border/40 mx-2 my-1" />
            <button
              onClick={handleExportDocx}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground/70 hover:bg-accent transition-colors"
            >
              <FileDown className="h-3.5 w-3.5 text-muted-foreground/50" />
              Word (.docx)
            </button>
            <button
              onClick={handleExportPdf}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground/70 hover:bg-accent transition-colors"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground/50" />
              PDF (.pdf)
            </button>
          </div>
        )}
      </div>
      <AISummaryDialog open={summaryOpen} onOpenChange={setSummaryOpen} />
    </>
  )
}
