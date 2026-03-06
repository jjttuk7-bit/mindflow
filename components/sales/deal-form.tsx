"use client"

import { useState } from "react"
import { toast } from "sonner"
import { X, Save, TrendingUp } from "lucide-react"

const STAGES = [
  { value: "lead", label: "리드" },
  { value: "contact", label: "접촉" },
  { value: "proposal", label: "제안" },
  { value: "negotiation", label: "협상" },
  { value: "closed_won", label: "성사" },
  { value: "closed_lost", label: "실패" },
]

export function DealForm({
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
    title: "",
    amount: "",
    stage: "lead",
    probability: "30",
    expected_close_date: "",
    notes: "",
  })

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("딜 제목을 입력해주세요")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/sales/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          title: form.title.trim(),
          amount: form.amount ? parseInt(form.amount) : 0,
          stage: form.stage,
          probability: parseInt(form.probability) || 0,
          expected_close_date: form.expected_close_date || undefined,
          notes: form.notes.trim() || undefined,
        }),
      })

      if (!res.ok) throw new Error()
      toast.success("딜이 추가되었습니다")
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
            <TrendingUp className="h-5 w-5" />
            딜 추가
          </h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">딜 제목 *</label>
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="보험 상품 제안"
              className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Amount + Probability */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">금액 (원)</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="10000000"
                className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">성사 확률 (%)</label>
              <input
                type="number"
                value={form.probability}
                onChange={(e) => setForm({ ...form, probability: e.target.value })}
                min="0"
                max="100"
                className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Stage */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">단계</label>
            <div className="flex gap-1.5 flex-wrap">
              {STAGES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setForm({ ...form, stage: s.value })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    form.stage === s.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Expected close date */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">예상 마감일</label>
            <input
              type="date"
              value={form.expected_close_date}
              onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">메모</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="딜 관련 메모..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
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
