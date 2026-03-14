"use client"

import { ChatSession } from "@/lib/supabase/types"
import { ChevronDown, Trash2 } from "lucide-react"

interface Props {
  sessions: ChatSession[]
  currentSessionId: string | null
  sessionsExpanded: boolean
  onToggleExpanded: () => void
  onLoadSession: (id: string) => void
  onDeleteSession: (id: string, e: React.MouseEvent) => void
}

export function ChatSessionList({
  sessions, currentSessionId, sessionsExpanded,
  onToggleExpanded, onLoadSession, onDeleteSession,
}: Props) {
  if (sessions.length === 0) return null

  return (
    <div className="border-b border-border/20">
      <button
        onClick={onToggleExpanded}
        className="w-full flex items-center justify-between px-5 py-2.5 text-xs font-medium text-muted-foreground/70 hover:text-muted-foreground transition-colors"
      >
        <span className="tracking-wide uppercase">최근 대화 ({sessions.length})</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${sessionsExpanded ? "" : "-rotate-90"}`} />
      </button>
      {sessionsExpanded && (
        <div className="px-3 pb-2 max-h-48 overflow-y-auto">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group flex items-center gap-1 rounded-md transition-colors duration-150 ${
                currentSessionId === session.id ? "bg-primary/10" : "hover:bg-accent"
              }`}
            >
              <button
                onClick={() => onLoadSession(session.id)}
                className={`flex-1 text-left px-3 py-2 text-sm min-w-0 ${
                  currentSessionId === session.id ? "text-primary" : "text-foreground/70"
                }`}
              >
                <p className="truncate">{session.title}</p>
                <p className="text-ui-xs text-muted-foreground/50 mt-0.5">
                  {new Date(session.created_at).toLocaleDateString()}
                </p>
              </button>
              <button
                onClick={(e) => onDeleteSession(session.id, e)}
                className="h-6 w-6 mr-2 flex items-center justify-center rounded text-muted-foreground/30 hover:text-destructive hover:bg-destructive/5 transition-all md:opacity-0 md:group-hover:opacity-100 shrink-0"
                aria-label="대화 삭제"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
