"use client"

import { ContentType } from "@/lib/supabase/types"
import { FileText, Link, Image, Mic, ArrowUp, Paperclip } from "lucide-react"

const typeButtons: { type: ContentType; icon: React.ReactNode; label: string }[] = [
  { type: "text", icon: <FileText className="h-3.5 w-3.5" />, label: "Text" },
  { type: "link", icon: <Link className="h-3.5 w-3.5" />, label: "Link" },
  { type: "image", icon: <Image className="h-3.5 w-3.5" />, label: "Image" },
  { type: "voice", icon: <Mic className="h-3.5 w-3.5" />, label: "Voice" },
  { type: "file", icon: <Paperclip className="h-3.5 w-3.5" />, label: "File" },
]

interface Props {
  activeType: ContentType
  canSubmit: boolean
  isSubmitting: boolean
  onTypeChange: (type: ContentType) => void
  onSubmit: () => void
}

export function ComposerToolbar({ activeType, canSubmit, isSubmitting, onTypeChange, onSubmit }: Props) {
  return (
    <div className="flex items-center justify-between px-3 pb-3">
      <div className="flex gap-0.5">
        {typeButtons.map((btn) => (
          <button
            key={btn.type}
            type="button"
            onClick={() => onTypeChange(btn.type)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200 ${
              activeType === btn.type
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {btn.icon}
            <span className="hidden sm:inline">{btn.label}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onPointerDown={(e) => { e.preventDefault(); if (canSubmit) onSubmit() }}
        disabled={!canSubmit}
        className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg h-10 sm:h-8 px-4 sm:px-3 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 transition-all touch-manipulation"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
            저장 중
          </span>
        ) : (
          <>
            <ArrowUp className="h-3.5 w-3.5" />
            저장
          </>
        )}
      </button>
    </div>
  )
}
