"use client"

import { forwardRef } from "react"
import { Send } from "lucide-react"

interface Props {
  input: string
  loading: boolean
  fullScreen?: boolean
  onInputChange: (v: string) => void
  onSend: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

export const ChatInputBar = forwardRef<HTMLInputElement, Props>(
  function ChatInputBar({ input, loading, fullScreen, onInputChange, onSend, onKeyDown }, ref) {
    return (
      <footer className="px-4 py-3 border-t border-border/40">
        <div className="flex items-center gap-2 bg-muted/50 border border-border/60 rounded-xl px-3 py-1.5 focus-within:ring-1 focus-within:ring-primary/30 focus-within:border-primary/30 transition-all">
          <input
            ref={ref}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={fullScreen ? () => setTimeout(() => (ref as React.RefObject<HTMLInputElement>)?.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 300) : undefined}
            placeholder="무엇이든 물어보세요..."
            disabled={loading}
            className="flex-1 bg-transparent text-[16px] md:text-sm py-1.5 focus:outline-none placeholder:text-muted-foreground/40 placeholder:italic disabled:opacity-50"
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || loading}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-all duration-200 disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-ui-xs text-muted-foreground/30 text-center mt-2">
          저장된 항목을 기반으로 AI가 답변합니다
        </p>
      </footer>
    )
  }
)
