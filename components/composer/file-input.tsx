"use client"

import { Paperclip, X } from "lucide-react"
import { toast } from "sonner"

interface Props {
  selectedFile: File | null
  isDragging: boolean
  isSubmitting: boolean
  content: string
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onClearFile: () => void
  setSelectedFile: (f: File | null) => void
  setIsDragging: (v: boolean) => void
  setContent: (v: string) => void
  setIsFocused: (v: boolean) => void
}

export function FileInput({
  selectedFile, isDragging, isSubmitting, content,
  fileInputRef, onClearFile, setSelectedFile, setIsDragging, setContent, setIsFocused,
}: Props) {
  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) {
      if (f.size > 20 * 1024 * 1024) { toast.error("파일 크기는 20MB까지 지원됩니다"); return }
      setSelectedFile(f)
    }
  }

  return (
    <div className="px-5 pt-4 pb-2 space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt,.csv,.xlsx,.xls,.md,.hwp,.rtf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) {
            if (f.size > 20 * 1024 * 1024) { toast.error("파일 크기는 20MB까지 지원됩니다"); return }
            setSelectedFile(f)
          }
          e.target.value = ""
        }}
      />

      {!selectedFile ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleFileDrop}
          className={`flex flex-col items-center justify-center h-32 rounded-lg border-2 border-dashed transition-all duration-200 ${
            isDragging ? "border-primary/50 bg-primary/5" : "border-border/50 hover:border-border/80"
          }`}
        >
          <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            <Paperclip className="h-4 w-4" />파일 선택
          </button>
          <p className="text-xs text-muted-foreground/40 mt-2">PDF, DOCX, TXT, CSV, XLSX (최대 20MB)</p>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/40">
          <Paperclip className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-ui-sm text-muted-foreground/60">{(selectedFile.size / 1024).toFixed(1)} KB</p>
          </div>
          <button onClick={onClearFile} className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="메모를 추가하세요 (선택사항)..."
        className="w-full min-h-[44px] resize-none bg-transparent text-ui-base leading-relaxed focus:outline-none placeholder:text-muted-foreground/40 placeholder:italic"
        disabled={isSubmitting}
      />
    </div>
  )
}
