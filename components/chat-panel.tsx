"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useStore } from "@/lib/store"
// Using native overflow scroll instead of Radix ScrollArea for reliable flex layout scrolling
import { ChatSession, ChatMessage } from "@/lib/supabase/types"
import {
  X,
  Send,
  Plus,
  MessageSquare,
  Loader2,
  ChevronDown,
  ExternalLink,
  ListTodo,
  FileText,
  Copy,
  Check,
  CheckCircle2,
  Trash2,
} from "lucide-react"
import { ChatExportMenu } from "@/components/chat-export-menu"

interface ChatSource {
  id: string
  content: string
  summary?: string | null
  type: string
}

// Parse suggestion blocks from message content
function parseSuggestions(content: string) {
  const suggestions: { type: "todo" | "memo"; text: string }[] = []
  const regex = /> \*\*할 일 제안\*\*: (.+)|> \*\*메모 제안\*\*: (.+)/g
  let match
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) suggestions.push({ type: "todo", text: match[1].trim() })
    if (match[2]) suggestions.push({ type: "memo", text: match[2].trim() })
  }
  return suggestions
}

export function ChatPanel({ fullScreen }: { fullScreen?: boolean } = {}) {
  const { chatOpen, setChatOpen } = useStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [streamingText, setStreamingText] = useState("")
  const [sessionsExpanded, setSessionsExpanded] = useState(false)
  const [sourcesMap, setSourcesMap] = useState<Record<string, ChatSource[]>>({})
  const [addedSuggestions, setAddedSuggestions] = useState<Set<string>>(new Set())
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [toolSteps, setToolSteps] = useState<Array<{ tool: string; status: "running" | "done"; summary?: string }>>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [messages, streamingText])

  // Focus input when panel opens
  useEffect(() => {
    if (chatOpen || fullScreen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [chatOpen, fullScreen])

  // Mobile keyboard detection via visualViewport API
  useEffect(() => {
    if (!fullScreen) return
    const viewport = window.visualViewport
    if (!viewport) return

    function onResize() {
      const kbHeight = window.innerHeight - viewport!.height
      setKeyboardHeight(kbHeight > 0 ? kbHeight : 0)
    }

    viewport.addEventListener("resize", onResize)
    return () => viewport.removeEventListener("resize", onResize)
  }, [fullScreen])

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
    setAddedSuggestions(new Set())
    setToolSteps([])
    setInput("")
    inputRef.current?.focus()
  }

  async function handleDeleteSession(sessionId: string, e: React.MouseEvent) {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`, { method: "DELETE" })
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId))
        if (currentSessionId === sessionId) {
          handleNewChat()
        }
      }
    } catch {
      // ignore
    }
  }

  async function handleAddSuggestion(type: "todo" | "memo", text: string) {
    const key = `${type}:${text}`
    if (addedSuggestions.has(key)) return

    try {
      if (type === "todo") {
        await fetch("/api/todos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text }),
        })
      } else {
        await fetch("/api/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "text", content: text }),
        })
      }
      setAddedSuggestions((prev) => new Set(prev).add(key))
    } catch {
      // ignore
    }
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
    setStreamingText("")

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

      // SSE streaming consumption
      const reader = res.body?.getReader()
      if (!reader) return

      const decoder = new TextDecoder()
      let fullText = ""
      let sessionSources: ChatSource[] = []
      let streamSessionId = currentSessionId

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          try {
            const data = JSON.parse(line.slice(6))

            if (data.type === "session") {
              streamSessionId = data.session_id
              sessionSources = data.sources || []
              if (!currentSessionId) {
                setCurrentSessionId(data.session_id)
                fetchSessions()
              }
            } else if (data.type === "tool_start") {
              setToolSteps((prev) => [
                ...prev,
                { tool: data.tool, status: "running" },
              ])
            } else if (data.type === "tool_result") {
              setToolSteps((prev) =>
                prev.map((s) =>
                  s.tool === data.tool && s.status === "running"
                    ? { ...s, status: "done", summary: data.summary }
                    : s
                )
              )
            } else if (data.type === "chunk") {
              fullText += data.text
              setStreamingText(fullText)
            } else if (data.type === "error") {
              fullText = data.error || "An error occurred."
            }
          } catch {
            // skip malformed JSON
          }
        }
      }

      // Finalize: add assistant message and clear streaming state
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        session_id: streamSessionId || "",
        role: "assistant",
        content: fullText.trim(),
        sources: sessionSources.map((s) => s.id),
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMsg])
      setStreamingText("")
      setToolSteps([])

      if (sessionSources.length > 0) {
        setSourcesMap((prev) => ({
          ...prev,
          [assistantMsg.id]: sessionSources,
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
      setStreamingText("")
      setToolSteps([])
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  async function handleCopy(id: string, content: string) {
    await navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  function renderMessageContent(msg: ChatMessage) {
    const suggestions = parseSuggestions(msg.content)
    // Remove suggestion lines from display text
    const cleanContent = msg.content
      .replace(/> \*\*할 일 제안\*\*: .+/g, "")
      .replace(/> \*\*메모 제안\*\*: .+/g, "")
      .trim()

    return (
      <>
        <p className="whitespace-pre-wrap">{cleanContent}</p>
        {suggestions.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {suggestions.map((s, i) => {
              const key = `${s.type}:${s.text}`
              const isAdded = addedSuggestions.has(key)
              return (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg bg-background/60 border border-border/30 px-3 py-2"
                >
                  {s.type === "todo" ? (
                    <ListTodo className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                  ) : (
                    <FileText className="h-3.5 w-3.5 mt-0.5 text-blue-500 shrink-0" />
                  )}
                  <span className="flex-1 text-xs text-foreground/80">{s.text}</span>
                  <button
                    onClick={() => handleAddSuggestion(s.type, s.text)}
                    disabled={isAdded}
                    className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-md transition-colors ${
                      isAdded
                        ? "bg-green-500/10 text-green-600"
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                    }`}
                  >
                    {isAdded ? "추가됨" : "추가"}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </>
    )
  }

  const toolLabels: Record<string, string> = {
    search: "검색 중...",
    summarize: "요약 중...",
    compare: "비교 분석 중...",
    create_memo: "생성 중...",
  }

  function renderToolSteps() {
    if (toolSteps.length === 0) return null
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-muted/50 space-y-1.5">
          {toolSteps.map((step, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {step.status === "running" ? (
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              ) : (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              )}
              <span className={step.status === "done" ? "text-muted-foreground/60" : "text-foreground/70"}>
                {step.status === "done" && step.summary
                  ? step.summary
                  : toolLabels[step.tool] || `${step.tool}...`}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Shared message rendering
  function renderMessages() {
    return (
      <>
        {messages.length === 0 && !streamingText && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/20 mb-4" />
            <p className="text-sm text-muted-foreground/50 italic">
              저장된 지식에 대해 무엇이든 물어보세요
            </p>
            <p className="text-xs text-muted-foreground/30 mt-2">
              AI가 저장된 항목에서 관련 내용을 찾아드려요
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary/10 text-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              }`}
            >
              {msg.role === "assistant" ? renderMessageContent(msg) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
              {msg.role === "assistant" ? (
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[10px] text-muted-foreground/40">
                    {formatTime(msg.created_at)}
                  </p>
                  <button
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors"
                    aria-label="Copy message"
                  >
                    {copiedId === msg.id ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              ) : (
                <p className="text-[10px] mt-1.5 text-primary/40 text-right">
                  {formatTime(msg.created_at)}
                </p>
              )}

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

        {/* Tool step indicators */}
        {renderToolSteps()}

        {/* Streaming text (real-time typing) */}
        {streamingText && (
          <div className="flex justify-start">
            <div className="max-w-[85%] bg-muted rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed text-foreground">
              <p className="whitespace-pre-wrap">{streamingText}</p>
            </div>
          </div>
        )}

        {/* Loading indicator (only when no streaming text yet) */}
        {loading && !streamingText && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2 text-muted-foreground/50">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="text-xs italic">생각하는 중...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </>
    )
  }

  // Shared session list rendering
  function renderSessionList() {
    if (sessions.length === 0) return null
    return (
      <div className="border-b border-border/20">
        <button
          onClick={() => setSessionsExpanded(!sessionsExpanded)}
          className="w-full flex items-center justify-between px-5 py-2.5 text-xs font-medium text-muted-foreground/70 hover:text-muted-foreground transition-colors"
        >
          <span className="tracking-wide uppercase">
            최근 대화 ({sessions.length})
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
              <div
                key={session.id}
                className={`group flex items-center gap-1 rounded-md transition-colors duration-150 ${
                  currentSessionId === session.id
                    ? "bg-primary/10"
                    : "hover:bg-accent"
                }`}
              >
                <button
                  onClick={() => loadSession(session.id)}
                  className={`flex-1 text-left px-3 py-2 text-sm min-w-0 ${
                    currentSessionId === session.id
                      ? "text-primary"
                      : "text-foreground/70"
                  }`}
                >
                  <p className="truncate">{session.title}</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                    {new Date(session.created_at).toLocaleDateString()}
                  </p>
                </button>
                <button
                  onClick={(e) => handleDeleteSession(session.id, e)}
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

  // Shared input bar rendering
  function renderInputBar() {
    return (
      <footer className="px-4 py-3 border-t border-border/40">
        <div className="flex items-center gap-2 bg-muted/50 border border-border/60 rounded-xl px-3 py-1.5 focus-within:ring-1 focus-within:ring-primary/30 focus-within:border-primary/30 transition-all">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={fullScreen ? () => setTimeout(() => inputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 300) : undefined}
            placeholder="무엇이든 물어보세요..."
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
          저장된 항목을 기반으로 AI가 답변합니다
        </p>
      </footer>
    )
  }

  const currentSession = sessions.find((s) => s.id === currentSessionId) ?? null

  // Full-screen mode for mobile tab
  if (fullScreen) {
    return (
      <div className="flex flex-col bg-background pb-16" style={{ height: keyboardHeight > 0 ? `calc(100dvh - ${keyboardHeight}px)` : '100dvh' }}>
        <header className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg tracking-tight text-foreground">DL Agent</h2>
          </div>
          <div className="flex items-center gap-1">
            <ChatExportMenu messages={messages} session={currentSession} disabled={loading} />
            <button
              onClick={handleNewChat}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-all duration-200"
              aria-label="New chat"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </header>

        {renderSessionList()}

        <div className="flex-1 min-h-0 overflow-y-auto" ref={scrollContainerRef}>
          <div className="px-4 py-4 space-y-4">
            {renderMessages()}
          </div>
        </div>

        {renderInputBar()}
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
              DL Agent
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <ChatExportMenu messages={messages} session={currentSession} disabled={loading} />
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

        {renderSessionList()}

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto" ref={scrollContainerRef}>
          <div className="px-4 py-4 space-y-4">
            {renderMessages()}
          </div>
        </div>

        {renderInputBar()}
      </div>
    </>
  )
}
