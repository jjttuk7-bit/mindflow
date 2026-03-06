"use client"

import { useState, useRef, useEffect } from "react"
import { toast } from "sonner"
import {
  X, Send, Loader2, Sparkles, FileText,
  MessageCircle, GraduationCap, BarChart3,
  ArrowLeft, Copy, Check,
} from "lucide-react"

type Mode = "briefing" | "roleplay" | "coaching" | "insight"

type Message = {
  role: "user" | "assistant"
  content: string
}

const MODES = [
  {
    value: "briefing" as Mode,
    label: "미팅 브리핑",
    desc: "고객 이력 기반 미팅 준비자료",
    icon: FileText,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
  },
  {
    value: "roleplay" as Mode,
    label: "롤플레이",
    desc: "AI 고객과 협상 연습",
    icon: MessageCircle,
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800",
  },
  {
    value: "coaching" as Mode,
    label: "리뷰 코칭",
    desc: "활동 분석 + 개선 피드백",
    icon: GraduationCap,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
  },
  {
    value: "insight" as Mode,
    label: "인사이트",
    desc: "딜 패턴 + 전략 분석",
    icon: BarChart3,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
  },
]

export function AIPartner({
  customerId,
  customerName,
  onClose,
}: {
  customerId?: string
  customerName?: string
  onClose: () => void
}) {
  const [mode, setMode] = useState<Mode | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = async (userMessage?: string) => {
    if (!mode) return

    const msg = userMessage || input.trim()
    if (mode === "roleplay" && !msg && messages.length > 0) return

    const newMessages = msg
      ? [...messages, { role: "user" as const, content: msg }]
      : messages

    if (msg) {
      setMessages(newMessages)
      setInput("")
    }

    setLoading(true)
    try {
      const res = await fetch("/api/sales/ai-partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          customer_id: customerId,
          message: msg || undefined,
        }),
      })

      if (!res.ok) throw new Error()
      const data = await res.json()

      setMessages([...newMessages, { role: "assistant", content: data.content }])
    } catch {
      toast.error("AI 응답에 실패했습니다")
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleModeSelect = (m: Mode) => {
    setMode(m)
    setMessages([])
    // Auto-start for non-roleplay modes
    if (m !== "roleplay") {
      setTimeout(() => sendMessage(), 100)
    } else {
      // Start roleplay with greeting
      setTimeout(() => sendMessage("시작해주세요."), 100)
    }
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("복사되었습니다")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (input.trim()) sendMessage()
    }
  }

  const currentMode = MODES.find(m => m.value === mode)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-card rounded-2xl border border-border/60 shadow-2xl overflow-hidden flex flex-col" style={{ height: "min(85vh, 700px)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 flex-shrink-0">
          <div className="flex items-center gap-2">
            {mode && (
              <button
                onClick={() => { setMode(null); setMessages([]) }}
                className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-base font-semibold">
                AI 영업 파트너
                {currentMode && <span className={`ml-2 text-sm ${currentMode.color}`}>· {currentMode.label}</span>}
              </h2>
              {customerName && (
                <p className="text-xs text-muted-foreground">{customerName}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Selection */}
        {!mode && (
          <div className="flex-1 overflow-y-auto p-5">
            <p className="text-sm text-muted-foreground mb-4">
              AI가 영업 활동을 도와드립니다. 원하는 모드를 선택하세요.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {MODES.map((m) => {
                const Icon = m.icon
                const isDisabled = !customerId && m.value !== "insight"
                return (
                  <button
                    key={m.value}
                    onClick={() => !isDisabled && handleModeSelect(m.value)}
                    disabled={isDisabled}
                    className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed ${m.bg}`}
                  >
                    <Icon className={`h-6 w-6 ${m.color}`} />
                    <div>
                      <p className="font-medium text-sm">{m.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                    </div>
                    {isDisabled && (
                      <p className="text-[10px] text-muted-foreground/60">고객 선택 필요</p>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Chat / Content Area */}
        {mode && (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted rounded-bl-md"
                  }`}>
                    {msg.role === "assistant" ? (
                      <div className="relative group">
                        <div className="text-sm leading-relaxed whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">
                          {msg.content.split("\n").map((line, j) => {
                            if (line.startsWith("## ")) {
                              return <h3 key={j} className="font-bold text-base mt-3 mb-1 first:mt-0">{line.replace("## ", "")}</h3>
                            }
                            if (line.startsWith("- ")) {
                              return <p key={j} className="ml-3 before:content-['•'] before:mr-2 before:text-primary">{line.replace("- ", "")}</p>
                            }
                            if (line.startsWith("**") && line.endsWith("**")) {
                              return <p key={j} className="font-semibold mt-2">{line.replace(/\*\*/g, "")}</p>
                            }
                            return line ? <p key={j}>{line}</p> : <br key={j} />
                          })}
                        </div>
                        <button
                          onClick={() => handleCopy(msg.content)}
                          className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 h-7 w-7 flex items-center justify-center rounded-lg hover:bg-accent transition-all"
                          title="복사"
                        >
                          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">분석 중...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input (for roleplay and follow-up questions) */}
            {(mode === "roleplay" || messages.length > 0) && (
              <div className="border-t border-border/60 px-4 py-3 flex-shrink-0">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      mode === "roleplay"
                        ? "고객에게 말해보세요..."
                        : "추가 질문을 입력하세요..."
                    }
                    rows={1}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none max-h-24"
                    style={{ minHeight: "40px" }}
                  />
                  <button
                    onClick={() => input.trim() && sendMessage()}
                    disabled={loading || !input.trim()}
                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
