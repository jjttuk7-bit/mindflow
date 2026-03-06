"use client"

import { useState } from "react"
import { toast } from "sonner"
import { X, Save, PhoneCall, Video, Send, FileText, MapPin, MessageSquare } from "lucide-react"

const TYPES = [
  { value: "call", label: "통화", icon: PhoneCall },
  { value: "meeting", label: "미팅", icon: Video },
  { value: "email", label: "이메일", icon: Send },
  { value: "visit", label: "방문", icon: MapPin },
  { value: "message", label: "메시지", icon: MessageSquare },
  { value: "note", label: "메모", icon: FileText },
]

export function ActivityForm({
  customerId,
  onClose,
  onSave,
}: {
  customerId: string
  onClose: () => void
  onSave: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    type: "note",
    content: "",
    duration_min: "",
  })

  const handleSave = async () => {
    if (!form.content.trim()) {
      toast.error("내용을 입력해주세요")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/sales/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          type: form.type,
          content: form.content.trim(),
          duration_min: form.duration_min ? parseInt(form.duration_min) : undefined,
          occurred_at: new Date().toISOString(),
        }),
      })

      if (!res.ok) throw new Error()
      toast.success("활동이 기록되었습니다")
      onSave()
    } catch {
      toast.error("저장에 실패했습니다")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-2xl border border-border/60 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <h2 className="text-lg font-semibold">활동 기록</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Type selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">활동 유형</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map((t) => {
                const Icon = t.icon
                return (
                  <button
                    key={t.value}
                    onClick={() => setForm({ ...form, type: t.value })}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm transition-all ${
                      form.type === t.value
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-border/60 text-muted-foreground hover:border-border"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">내용 *</label>
            <textarea
              autoFocus
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="통화 내용, 미팅 메모 등을 기록하세요..."
              rows={5}
              className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Duration */}
          {["call", "meeting", "visit"].includes(form.type) && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">소요 시간 (분)</label>
              <input
                type="number"
                value={form.duration_min}
                onChange={(e) => setForm({ ...form, duration_min: e.target.value })}
                placeholder="30"
                min="1"
                className="w-32 px-4 py-2.5 rounded-lg border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/60 bg-muted/30">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.content.trim()}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  )
}
