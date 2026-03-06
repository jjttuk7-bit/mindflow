"use client"

import { useState } from "react"
import { FileMeta } from "@/lib/supabase/types"
import { FileText, FileSpreadsheet, File, Download, ChevronDown, ChevronUp, RefreshCw, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface FileCardProps {
  meta: FileMeta
  itemId: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(fileType: string) {
  if (fileType.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />
  if (fileType.includes("word") || fileType.includes("docx")) return <FileText className="h-5 w-5 text-blue-500" />
  if (fileType.includes("sheet") || fileType.includes("xlsx") || fileType.includes("csv")) return <FileSpreadsheet className="h-5 w-5 text-green-500" />
  if (fileType.includes("text")) return <FileText className="h-5 w-5 text-muted-foreground" />
  return <File className="h-5 w-5 text-muted-foreground" />
}

function getFileExtLabel(fileName: string): string {
  const ext = fileName.split(".").pop()?.toUpperCase() || "FILE"
  return ext
}

export function FileCard({ meta, itemId }: FileCardProps) {
  const [showText, setShowText] = useState(false)
  const [reanalyzing, setReanalyzing] = useState(false)

  async function handleReanalyze() {
    setReanalyzing(true)
    try {
      const res = await fetch(`/api/ai/analyze-file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, fileUrl: meta.file_url, fileName: meta.file_name }),
      })
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      toast.success("파일 재분석 완료")
      if (data.summary) {
        meta.ai_summary = data.summary
        meta.extracted_text = data.extracted_text
      }
    } catch {
      toast.error("파일 분석에 실패했습니다")
    } finally {
      setReanalyzing(false)
    }
  }

  return (
    <div className="space-y-2">
      {/* File info bar */}
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/40 border border-border/40 group">
        {getFileIcon(meta.file_type)}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{meta.file_name}</p>
          <p className="text-[11px] text-muted-foreground/60">
            {getFileExtLabel(meta.file_name)} · {formatFileSize(meta.file_size)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleReanalyze}
            disabled={reanalyzing}
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all"
            title="재분석"
          >
            {reanalyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </button>
          <a
            href={meta.file_url}
            download={meta.file_name}
            target="_blank"
            rel="noopener noreferrer"
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors"
            title="다운로드"
          >
            <Download className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* AI Summary */}
      {meta.ai_summary && (
        <div className="px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
          <p className="text-xs text-foreground/70 leading-relaxed whitespace-pre-wrap">
            {meta.ai_summary}
          </p>
        </div>
      )}

      {/* Extracted text toggle */}
      {meta.extracted_text && (
        <button
          onClick={() => setShowText(!showText)}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors px-1"
        >
          {showText ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {showText ? "원문 숨기기" : "추출된 텍스트 보기"}
        </button>
      )}
      {showText && meta.extracted_text && (
        <div className="px-3 py-2 rounded-lg bg-muted/30 border border-border/30 max-h-48 overflow-y-auto">
          <p className="text-xs text-muted-foreground/70 leading-relaxed whitespace-pre-wrap">
            {meta.extracted_text}
          </p>
        </div>
      )}
    </div>
  )
}
