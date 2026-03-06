"use client"

import { useState } from "react"
import { toast } from "sonner"
import { X, Save, CheckCircle2 } from "lucide-react"

const PRIORITIES = [
  { value: "low", label: "낮음", color: "text-gray-500 border-gray-300" },
  { value: "medium", label: "보통", color: "text-blue-500 border-blue-400" },
  { value: "high", label: "높음", color: "text-amber-500 border-amber-400" },
  { value: "urgent", label: "긴급", color: "text-red-500 border-red-400" },
]

export function FollowUpForm({
  customerId,
  onClose,
  onSave,
}: {
  customerId: string
  onClose: () => void
  onSave: () => void
}) {
  const [saving, setSaving] = useState(false)

  // Default due date: tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const defaultDate = tomorrow.toISOString().split("T")[0]

  const [form, setForm] = useState({
    title: "",
    description: "",
    due_date: defaultDate,
    priority: "medium",
  })

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("제목을 입력해주세요")
      return
    }
    if (!form.due_date) {
      toast.error("마감일을 선택해주세요")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/sales/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          due_date: new Date(form.due_date).toISOString(),
          priority: form.priority,
        }),
      })

      if (!res.ok) throw new Error()
      toast.success("할 일이 추가되었습니다")
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
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            할 일 추가
          </h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">제목 *</label>
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="견적서 발송, 재방문 약속 등"
              className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">설명</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="상세 내용..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Due date */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">마감일 *</label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">우선순위</label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setForm({ ...form, priority: p.value })}
                  className={`flex-1 py-2 rounded-lg border-2 text-xs font-medium transition-all ${
                    form.priority === p.value
                      ? `${p.color} bg-background shadow-sm`
                      : "border-border/60 text-muted-foreground hover:border-border"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
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
            disabled={saving || !form.title.trim()}
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
