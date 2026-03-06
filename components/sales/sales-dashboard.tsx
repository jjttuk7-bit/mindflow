"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Users, TrendingUp, Calendar, Plus, Search,
  Phone, Mail, Building2, Star, ChevronRight,
  Filter, ArrowUpDown, Flame, Clock, Mic, CreditCard, Sparkles,
} from "lucide-react"
import { CustomerForm } from "./customer-form"
import { MeetingCapture } from "./meeting-capture"
import { BusinessCardScanner } from "./business-card-scanner"
import { NotificationPanel, NotificationBadge } from "./notification-panel"
import { AIPartner } from "./ai-partner"

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
  created_at: string
  updated_at: string
  last_activity_at: string | null
  last_activity_type: string | null
  activity_count: number
  pending_follow_ups: number
}

type Stats = {
  total: number
  byGrade: Record<string, number>
}

const GRADE_COLORS: Record<string, string> = {
  S: "bg-amber-500 text-white",
  A: "bg-blue-500 text-white",
  B: "bg-emerald-500 text-white",
  C: "bg-gray-400 text-white",
  D: "bg-gray-300 text-gray-600",
}

const GRADE_BG: Record<string, string> = {
  S: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
  A: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
  B: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800",
  C: "bg-gray-50 border-gray-200 dark:bg-gray-900/30 dark:border-gray-700",
  D: "bg-gray-50 border-gray-200 dark:bg-gray-900/30 dark:border-gray-700",
}

const SOURCE_LABELS: Record<string, string> = {
  referral: "소개",
  cold: "콜드",
  inbound: "인바운드",
  event: "이벤트",
  other: "기타",
}

const ACTIVITY_LABELS: Record<string, string> = {
  call: "통화",
  meeting: "미팅",
  email: "이메일",
  note: "메모",
  visit: "방문",
  message: "메시지",
}

function calcTempLabel(grade: string, lastActivityAt: string | null, activityCount: number): { label: string; color: string } {
  let score = 0
  const gradeScores: Record<string, number> = { S: 30, A: 24, B: 16, C: 8, D: 0 }
  score += gradeScores[grade] || 0

  if (lastActivityAt) {
    const daysSince = (Date.now() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince <= 3) score += 30
    else if (daysSince <= 7) score += 24
    else if (daysSince <= 14) score += 16
    else if (daysSince <= 30) score += 8
    else score += 2
  }

  score += Math.min(activityCount * 4, 20)

  if (score >= 70) return { label: "HOT", color: "text-red-500" }
  if (score >= 45) return { label: "WARM", color: "text-amber-500" }
  if (score >= 25) return { label: "COOL", color: "text-blue-500" }
  return { label: "COLD", color: "text-gray-400" }
}

function formatRelative(dateStr: string | null) {
  if (!dateStr) return null
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffDay = Math.floor(diffMs / 86400000)
  if (diffDay === 0) return "오늘"
  if (diffDay === 1) return "어제"
  if (diffDay < 7) return `${diffDay}일 전`
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}주 전`
  return `${Math.floor(diffDay / 30)}개월 전`
}

export function SalesDashboard() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({ total: 0, byGrade: {} })
  const [search, setSearch] = useState("")
  const [gradeFilter, setGradeFilter] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [sortBy, setSortBy] = useState<"updated_at" | "name" | "grade">("updated_at")
  const [showMeetingCapture, setShowMeetingCapture] = useState(false)
  const [showCardScanner, setShowCardScanner] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showAIPartner, setShowAIPartner] = useState(false)

  const fetchCustomers = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set("q", search)
      if (gradeFilter) params.set("grade", gradeFilter)
      params.set("limit", "100")

      const res = await fetch(`/api/sales/customers?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCustomers(data.customers)
      setStats({
        total: data.total,
        byGrade: data.customers.reduce((acc: Record<string, number>, c: Customer) => {
          acc[c.grade] = (acc[c.grade] || 0) + 1
          return acc
        }, {}),
      })
    } catch {
      toast.error("고객 목록을 불러올 수 없습니다")
    } finally {
      setLoading(false)
    }
  }, [search, gradeFilter])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const handleDelete = async (id: string) => {
    if (!confirm("이 고객을 삭제하시겠습니까?")) return
    const res = await fetch(`/api/sales/customers/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("고객이 삭제되었습니다")
      fetchCustomers()
    }
  }

  const sorted = [...customers].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name, "ko")
    if (sortBy === "grade") {
      const order = ["S", "A", "B", "C", "D"]
      return order.indexOf(a.grade) - order.indexOf(b.grade)
    }
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                DotLine <span className="text-primary">Sales</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                고객 관계를 한눈에 관리하세요
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-accent"
              >
                DotLine Core
              </a>
              <button
                onClick={() => setShowAIPartner(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-primary/30 text-primary hover:bg-primary/5 transition-colors"
                title="AI 영업 파트너"
              >
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">AI</span>
              </button>
              <NotificationBadge onClick={() => setShowNotifications(true)} />
              <button
                onClick={() => setShowMeetingCapture(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="미팅 캡처"
              >
                <Mic className="h-4 w-4" />
                <span className="hidden sm:inline">미팅</span>
              </button>
              <button
                onClick={() => setShowCardScanner(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="명함 스캔"
              >
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">명함</span>
              </button>
              <button
                onClick={() => { setEditingCustomer(null); setShowForm(true) }}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">고객 추가</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card rounded-xl border border-border/60 p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">전체 고객</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{stats.total}</p>
          </div>
          <div className="bg-card rounded-xl border border-border/60 p-4">
            <div className="flex items-center gap-2 text-amber-500 mb-2">
              <Star className="h-4 w-4" />
              <span className="text-xs font-medium">S/A 등급</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {(stats.byGrade["S"] || 0) + (stats.byGrade["A"] || 0)}
            </p>
          </div>
          <div className="bg-card rounded-xl border border-border/60 p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">이번 주 신규</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {customers.filter(c => {
                const d = new Date(c.created_at)
                const week = new Date()
                week.setDate(week.getDate() - 7)
                return d >= week
              }).length}
            </p>
          </div>
          <div className="bg-card rounded-xl border border-border/60 p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Calendar className="h-4 w-4" />
              <span className="text-xs font-medium">오늘 등록</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {customers.filter(c => {
                const d = new Date(c.created_at)
                const today = new Date()
                return d.toDateString() === today.toDateString()
              }).length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름, 회사, 전화번호 검색..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
              <Filter className="h-3.5 w-3.5 text-muted-foreground ml-2" />
              {["S", "A", "B", "C", "D"].map((g) => (
                <button
                  key={g}
                  onClick={() => setGradeFilter(gradeFilter === g ? null : g)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                    gradeFilter === g
                      ? GRADE_COLORS[g]
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSortBy(
                sortBy === "updated_at" ? "name" : sortBy === "name" ? "grade" : "updated_at"
              )}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border/60 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sortBy === "updated_at" ? "최근순" : sortBy === "name" ? "이름순" : "등급순"}
            </button>
          </div>
        </div>

        {/* Customer List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border/60 p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-3 w-48 bg-muted rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {search || gradeFilter ? "검색 결과가 없습니다" : "아직 등록된 고객이 없습니다"}
            </p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              {!search && !gradeFilter && "첫 고객을 추가해보세요!"}
            </p>
            {!search && !gradeFilter && (
              <button
                onClick={() => { setEditingCustomer(null); setShowForm(true) }}
                className="mt-4 inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                고객 추가
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((customer) => (
              <div
                key={customer.id}
                className={`group bg-card rounded-xl border p-4 hover:shadow-md transition-all cursor-pointer ${GRADE_BG[customer.grade]}`}
                onClick={() => router.push(`/sales/customers/${customer.id}`)}
              >
                <div className="flex items-center gap-4">
                  {/* Avatar / Grade badge */}
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${GRADE_COLORS[customer.grade]}`}>
                    {customer.grade}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground truncate">{customer.name}</h3>
                      {(() => {
                        const temp = calcTempLabel(customer.grade, customer.last_activity_at, customer.activity_count || 0)
                        return (
                          <span className={`flex items-center gap-0.5 text-[10px] font-bold ${temp.color}`}>
                            <Flame className="h-3 w-3" />
                            {temp.label}
                          </span>
                        )
                      })()}
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium flex-shrink-0">
                        {SOURCE_LABELS[customer.source] || customer.source}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      {customer.company && (
                        <span className="flex items-center gap-1 truncate">
                          <Building2 className="h-3 w-3 flex-shrink-0" />
                          {customer.company}
                          {customer.role && <span className="text-muted-foreground/50">· {customer.role}</span>}
                        </span>
                      )}
                    </div>
                    {/* Last contact + counts */}
                    <div className="flex items-center gap-3 mt-1">
                      {customer.last_activity_at && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                          <Clock className="h-2.5 w-2.5" />
                          {formatRelative(customer.last_activity_at)}
                          {customer.last_activity_type && ` · ${ACTIVITY_LABELS[customer.last_activity_type] || customer.last_activity_type}`}
                        </span>
                      )}
                      {(customer.pending_follow_ups > 0) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 font-medium">
                          할일 {customer.pending_follow_ups}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contact icons */}
                  <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                    {customer.phone && (
                      <a
                        href={`tel:${customer.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title={customer.phone}
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                    {customer.email && (
                      <a
                        href={`mailto:${customer.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title={customer.email}
                      >
                        <Mail className="h-4 w-4" />
                      </a>
                    )}
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Customer Form Modal */}
      {showForm && (
        <CustomerForm
          customer={editingCustomer}
          onClose={() => { setShowForm(false); setEditingCustomer(null) }}
          onSave={() => { setShowForm(false); setEditingCustomer(null); fetchCustomers() }}
          onDelete={editingCustomer ? () => { handleDelete(editingCustomer.id); setShowForm(false); setEditingCustomer(null) } : undefined}
        />
      )}

      {/* Meeting Capture Modal */}
      {showMeetingCapture && (
        <MeetingCapture
          onClose={() => setShowMeetingCapture(false)}
          onSave={() => { setShowMeetingCapture(false); fetchCustomers() }}
        />
      )}

      {/* Business Card Scanner Modal */}
      {showCardScanner && (
        <BusinessCardScanner
          onClose={() => setShowCardScanner(false)}
          onCreated={(id) => { setShowCardScanner(false); router.push(`/sales/customers/${id}`) }}
        />
      )}

      {/* Notification Panel */}
      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      {/* AI Partner */}
      {showAIPartner && (
        <AIPartner
          onClose={() => setShowAIPartner(false)}
        />
      )}
    </div>
  )
}
