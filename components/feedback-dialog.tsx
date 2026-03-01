"use client"

import { useState } from "react"
import { X, Send, MessageCircleHeart } from "lucide-react"

const CATEGORIES = [
  { value: "bug", label: "버그 제보" },
  { value: "feature", label: "기능 요청" },
  { value: "improvement", label: "개선 의견" },
  { value: "general", label: "기타" },
]

export function FeedbackButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm hover:bg-accent transition-colors"
      >
        <MessageCircleHeart className="h-5 w-5 text-muted-foreground/60" />
        Feedback
      </button>
      {open && <FeedbackDialog onClose={() => setOpen(false)} />}
    </>
  )
}

export function SidebarFeedbackButton({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => { setOpen(true); onClose() }}
        className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground/70 hover:bg-accent hover:text-foreground transition-all duration-200"
      >
        <MessageCircleHeart className="h-4 w-4 text-muted-foreground/50" />
        Feedback
      </button>
      {open && <FeedbackDialog onClose={() => setOpen(false)} />}
    </>
  )
}

function FeedbackDialog({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState("general")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim() || sending) return

    setSending(true)
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message }),
      })
      if (res.ok) {
        setSent(true)
        setTimeout(() => onClose(), 1500)
      }
    } catch {
      // ignore
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-border/60 bg-background shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <h2 className="text-base font-semibold text-foreground">피드백 보내기</h2>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {sent ? (
          <div className="px-5 py-12 text-center">
            <div className="text-3xl mb-3">&#10024;</div>
            <p className="text-base font-medium text-foreground">감사합니다!</p>
            <p className="text-sm text-muted-foreground mt-1">소중한 의견이 전달되었습니다.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">카테고리</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      category === cat.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="feedback-message" className="block text-sm font-medium text-foreground mb-2">
                내용
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="어떤 점이 좋았거나, 개선되면 좋겠는 점을 알려주세요..."
                rows={4}
                maxLength={2000}
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none"
              />
              <p className="text-[11px] text-muted-foreground/40 mt-1 text-right">
                {message.length}/2000
              </p>
            </div>

            <button
              type="submit"
              disabled={!message.trim() || sending}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
              {sending ? "전송 중..." : "보내기"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
