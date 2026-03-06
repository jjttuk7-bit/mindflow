"use client"

import { useState } from "react"
import { toast } from "sonner"
import { X, Trash2, Save, User, Building2, Phone, Mail, Star } from "lucide-react"

type Customer = {
  id: string
  name: string
  company: string | null
  role: string | null
  phone: string | null
  email: string | null
  grade: string
  source: string
  notes: string | null
}

const GRADES = [
  { value: "S", label: "S", desc: "최우선 고객", color: "bg-amber-500 text-white" },
  { value: "A", label: "A", desc: "주요 고객", color: "bg-blue-500 text-white" },
  { value: "B", label: "B", desc: "일반 고객", color: "bg-emerald-500 text-white" },
  { value: "C", label: "C", desc: "잠재 고객", color: "bg-gray-400 text-white" },
  { value: "D", label: "D", desc: "비활성", color: "bg-gray-300 text-gray-600" },
]

const SOURCES = [
  { value: "referral", label: "소개" },
  { value: "cold", label: "콜드" },
  { value: "inbound", label: "인바운드" },
  { value: "event", label: "이벤트" },
  { value: "other", label: "기타" },
]

export function CustomerForm({
  customer,
  onClose,
  onSave,
  onDelete,
}: {
  customer: Customer | null
  onClose: () => void
  onSave: () => void
  onDelete?: () => void
}) {
  const isEdit = !!customer
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: customer?.name || "",
    company: customer?.company || "",
    role: customer?.role || "",
    phone: customer?.phone || "",
    email: customer?.email || "",
    grade: customer?.grade || "C",
    source: customer?.source || "other",
    notes: customer?.notes || "",
  })

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("이름을 입력해주세요")
      return
    }

    setSaving(true)
    try {
      const url = isEdit ? `/api/sales/customers/${customer.id}` : "/api/sales/customers"
      const method = isEdit ? "PATCH" : "POST"

      const body = {
        name: form.name.trim(),
        company: form.company.trim() || null,
        role: form.role.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        grade: form.grade,
        source: form.source,
        notes: form.notes.trim() || null,
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "저장 실패")
      }

      toast.success(isEdit ? "고객 정보가 수정되었습니다" : "새 고객이 추가되었습니다")
      onSave()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-card rounded-2xl border border-border/60 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <h2 className="text-lg font-semibold">
            {isEdit ? "고객 정보 수정" : "새 고객 추가"}
          </h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">이름 *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="홍길동"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Company + Role */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">회사</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="ABC주식회사"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">직함</label>
              <input
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder="팀장"
                className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">전화번호</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="010-1234-5678"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">이메일</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  type="email"
                  placeholder="email@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </div>

          {/* Grade */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
              <Star className="h-3 w-3" /> 고객 등급
            </label>
            <div className="flex gap-2">
              {GRADES.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setForm({ ...form, grade: g.value })}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg border-2 transition-all ${
                    form.grade === g.value
                      ? `${g.color} border-transparent shadow-md scale-105`
                      : "border-border/60 hover:border-border text-muted-foreground"
                  }`}
                >
                  <span className="text-sm font-bold">{g.label}</span>
                  <span className={`text-[10px] ${form.grade === g.value ? "opacity-80" : "opacity-50"}`}>
                    {g.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">유입 경로</label>
            <div className="flex gap-2 flex-wrap">
              {SOURCES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setForm({ ...form, source: s.value })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    form.source === s.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">메모</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="고객에 대한 메모..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/60 bg-muted/30">
          {isEdit && onDelete ? (
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 text-sm text-destructive hover:text-destructive/80 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              삭제
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
