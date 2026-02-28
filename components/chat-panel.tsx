"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useStore } from "@/lib/store"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatSession, ChatMessage } from "@/lib/supabase/types"
import {
  X,
  Send,
  Plus,
  MessageSquare,
  Loader2,
  ChevronDown,
  ExternalLink,
} from "lucide-react"

interface ChatSource {
  id: string
  content: string
  summary?: string | null
  type: string
}

export function ChatPanel({ fullScreen }: { fullScreen?: boolean } = {}) {
  const { chatOpen, setChatOpen } = useStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [sessionsExpanded, setSessionsExpanded] = useState(false)
  const [sourcesMap, setSourcesMap] = useState<Record<string, ChatSource[]>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Focus input when panel opens
  useEffect(() => {
    if (chatOpen || fullScreen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [chatOpen, fullScreen])

  // Fetch sessions when panel opens
  useEffect(() => {
    if (chatOpen || fullScreen) {
      fetchSessions()
    }
  }, [chatOpen, fullScreen])

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/sessions")
      if (res.ok) {
        const data = await res.json()
        setSessions(data)
      }
    } catch {
      // ignore
    }
  }, [])

  const loadSession = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
        setCurrentSessionId(sessionId)
        setSessionsExpanded(false)
      }
    } catch {
      // ignore
    }
  }, [])

  function handleNewChat() {
    setMessages([])
    setCurrentSessionId(null)
    setSourcesMap({})
    setInput("")
    inputRef.current?.focus()
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    setInput("")

    // Optimistically add user message
    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: currentSessionId || "",
      role: "user",
      content: text,
      sources: null,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          session_id: currentSessionId,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          session_id: currentSessionId || "",
          role: "assistant",
          content: err.error || "Something went wrong. Please try again.",
          sources: null,
          created_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, errorMsg])
        return
      }

      const data = await res.json()

      // Update session ID if new
      if (!currentSessionId) {
        setCurrentSessionId(data.session_id)
        fetchSessions()
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        session_id: data.session_id,
        role: "assistant",
        content: data.message,
        sources: data.sources?.map((s: ChatSource) => s.id) || null,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMsg])

      // Store sources for this message
      if (data.sources?.length > 0) {
        setSourcesMap((prev) => ({
          ...prev,
          [assistantMsg.id]: data.sources,
        }))
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        session_id: currentSessionId || "",
        role: "assistant",
        content: "Network error. Please check your connection and try again.",
        sources: null,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Full-screen mode for mobile tab
  if (fullScreen) {
    return (
      <div className="flex flex-col h-full bg-background pb-16">
        <header className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg tracking-tight text-foreground">AI Chat</h2>
          </div>
          <button
            onClick={handleNewChat}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-all duration-200"
            aria-label="New chat"
          >
            <Plus className="h-4 w-4" />
          </button>
        </header>

        {sessions.length > 0 && (
          <div className="border-b border-border/20">
            <button
              onClick={() => setSessionsExpanded(!sessionsExpanded)}
              className="w-full flex items-center justify-between px-5 py-2.5 text-xs font-medium text-muted-foreground/70 hover:text-muted-foreground transition-colors"
            >
              <span className="tracking-wide uppercase">Recent Chats ({sessions.length})</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${sessionsExpanded ? "" : "-rotate-90"}`} />
            </button>
            {sessionsExpanded && (
              <div className="px-3 pb-2 max-h-48 overflow-y-auto">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => loadSession(session.id)}
                    className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors duration-150 ${
                      currentSessionId === session.id ? "bg-primary/10 text-primary" : "text-foreground/70 hover:bg-accent"
                    }`}
                  >
                    <p className="truncate">{session.title}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">{new Date(session.created_at).toLocaleDateString()}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/20 mb-4" />
                <p className="text-sm text-muted-foreground/50 italic">Ask anything about your knowledge base</p>
                <p className="text-xs text-muted-foreground/30 mt-2">AI will search your saved items for relevant context</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user" ? "bg-primary/10 text-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-[10px] mt-1.5 ${msg.role === "user" ? "text-primary/40 text-right" : "text-muted-foreground/40"}`}>
                    {formatTime(msg.created_at)}
                  </p>
                  {msg.role === "assistant" && sourcesMap[msg.id] && sourcesMap[msg.id].length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/20">
                      {sourcesMap[msg.id].map((source, idx) => (
                        <span key={source.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background border border-border/40 text-[10px] text-muted-foreground/70">
                          <ExternalLink className="h-2.5 w-2.5" />
                          <span className="truncate max-w-[120px]">[{idx + 1}] {source.summary || source.content.slice(0, 30)}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2 text-muted-foreground/50">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="text-xs italic">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <footer className="px-4 py-3 border-t border-border/40">
          <div className="flex items-center gap-2 bg-muted/50 border border-border/60 rounded-xl px-3 py-1.5 focus-within:ring-1 focus-within:ring-primary/30">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your knowledge..."
              disabled={loading}
              className="flex-1 bg-transparent text-sm py-1.5 focus:outline-none placeholder:text-muted-foreground/40 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-primary hover:bg-primary/10 disabled:opacity-30"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </footer>
      </div>
    )
  }

  return (
    <>
      {/* Overlay */}
      {chatOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300"
          onClick={() => setChatOpen(false)}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] max-w-[calc(100vw-1rem)] bg-background border-l border-border/60 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          chatOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg tracking-tight text-foreground">
              AI Chat
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleNewChat}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-all duration-200"
              aria-label="New chat"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={() => setChatOpen(false)}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-all duration-200"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Session list (collapsible) */}
        {sessions.length > 0 && (
          <div className="border-b border-border/20">
            <button
              onClick={() => setSessionsExpanded(!sessionsExpanded)}
              className="w-full flex items-center justify-between px-5 py-2.5 text-xs font-medium text-muted-foreground/70 hover:text-muted-foreground transition-colors"
            >
              <span className="tracking-wide uppercase">
                Recent Chats ({sessions.length})
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  sessionsExpanded ? "" : "-rotate-90"
                }`}
              />
            </button>
            {sessionsExpanded && (
              <div className="px-3 pb-2 max-h-48 overflow-y-auto">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => loadSession(session.id)}
                    className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors duration-150 ${
                      currentSessionId === session.id
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/70 hover:bg-accent"
                    }`}
                  >
                    <p className="truncate">{session.title}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                      {new Date(session.created_at).toLocaleDateString()}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1">
          <div className="px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/20 mb-4" />
                <p className="text-sm text-muted-foreground/50 italic">
                  Ask anything about your knowledge base
                </p>
                <p className="text-xs text-muted-foreground/30 mt-2">
                  AI will search your saved items for relevant context
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary/10 text-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={`text-[10px] mt-1.5 ${
                      msg.role === "user"
                        ? "text-primary/40 text-right"
                        : "text-muted-foreground/40"
                    }`}
                  >
                    {formatTime(msg.created_at)}
                  </p>

                  {/* Source chips for assistant messages */}
                  {msg.role === "assistant" &&
                    sourcesMap[msg.id] &&
                    sourcesMap[msg.id].length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/20">
                        {sourcesMap[msg.id].map((source, idx) => (
                          <button
                            key={source.id}
                            onClick={() => setChatOpen(false)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background border border-border/40 text-[10px] text-muted-foreground/70 hover:text-primary hover:border-primary/30 transition-colors"
                            title={source.summary || source.content.slice(0, 100)}
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                            <span className="truncate max-w-[120px]">
                              [{idx + 1}]{" "}
                              {source.summary || source.content.slice(0, 30)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2 text-muted-foreground/50">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="text-xs italic">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input bar */}
        <footer className="px-4 py-3 border-t border-border/40">
          <div className="flex items-center gap-2 bg-muted/50 border border-border/60 rounded-xl px-3 py-1.5 focus-within:ring-1 focus-within:ring-primary/30 focus-within:border-primary/30 transition-all">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your knowledge..."
              disabled={loading}
              className="flex-1 bg-transparent text-sm py-1.5 focus:outline-none placeholder:text-muted-foreground/40 placeholder:italic disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-all duration-200 disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/30 text-center mt-2">
            AI answers based on your saved items
          </p>
        </footer>
      </div>
    </>
  )
}
