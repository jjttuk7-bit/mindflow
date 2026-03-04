"use client"

import { useState } from "react"
import { Download, FileText, FileIcon, Loader2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { ChatMessage, ChatSession } from "@/lib/supabase/types"
import {
  generateChatDocx,
  generateChatPdf,
  downloadBlob,
  getChatExportFilename,
  type ChatExportData,
} from "@/lib/chat-export"

interface ChatExportMenuProps {
  messages: ChatMessage[]
  session?: ChatSession | null
  disabled?: boolean
}

export function ChatExportMenu({ messages, session, disabled }: ChatExportMenuProps) {
  const [exporting, setExporting] = useState<"docx" | "pdf" | null>(null)

  const isDisabled = disabled || messages.length === 0

  async function handleExport(format: "docx" | "pdf") {
    if (isDisabled || exporting) return
    setExporting(format)

    try {
      const data: ChatExportData = {
        title: session?.title || "DL Agent",
        messages,
        exportedAt: new Date(),
      }

      if (format === "docx") {
        const blob = await generateChatDocx(data)
        downloadBlob(blob, getChatExportFilename(data.title, "docx"))
      } else {
        const blob = await generateChatPdf(data)
        downloadBlob(blob, getChatExportFilename(data.title, "pdf"))
      }
    } catch (err) {
      console.error("Export failed:", err)
    } finally {
      setExporting(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          disabled={isDisabled}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-all duration-200 disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="Export chat"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8}>
        <DropdownMenuItem onClick={() => handleExport("docx")} disabled={!!exporting}>
          <FileText className="h-4 w-4" />
          <span>Word (.docx)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("pdf")} disabled={!!exporting}>
          <FileIcon className="h-4 w-4" />
          <span>PDF (.pdf)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
