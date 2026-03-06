"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft, Phone, Mail, Building2, Star, Edit3,
  Plus, Clock, MessageSquare, PhoneCall, Video,
  FileText, MapPin, Send, Calendar, TrendingUp,
  AlertCircle, CheckCircle2, ChevronDown, ChevronUp,
  Flame, Mic, Sparkles, Loader2,
} from "lucide-react"
import { CustomerForm } from "./customer-form"
import { ActivityForm } from "./activity-form"
import { DealForm } from "./deal-form"
import { FollowUpForm } from "./follow-up-form"
import { MeetingCapture } from "./meeting-capture"
import { AIPartner } from "./ai-partner"

type Activity = {
  id: string
  type: string
  content: string
  summary: string | null
  duration_min: number | null
  occurred_at: string
  created_at: string
}

type Deal = {
  id: string
  title: string
  amount: number
  stage: string
  probability: number
  expected_close_date: string | null
  closed_at: string | null
  created_at: string
}

type FollowUp = {
  id: string
  title: string
  description: string | null
  due_date: string
  status: string
  priority: string
  completed_at: string | null
}

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
  activities: Activity[]
  deals: Deal[]
  follow_ups: FollowUp[]
}

const GRADE_COLORS: Record<string, string> = {
  S: "bg-amber-500 text-white",
  A: "bg-blue-500 text-white",
  B: "bg-emerald-500 text-white",
  C: "bg-gray-400 text-white",
  D: "bg-gray-300 text-gray-600",
}

const ACTIVITY_ICONS: Record<string, typeof Phone> = {
  call: PhoneCall,
  meeting: Video,
  email: Send,
  note: FileText,
  visit: MapPin,
  message: MessageSquare,
}

const ACTIVITY_LABELS: Record<string, string> = {
  call: "통화",
  meeting: "미팅",
  email: "이메일",
  note: "메모",
  visit: "방문",
  message: "메시지",
}

const STAGE_LABELS: Record<string, string> = {
  lead: "리드",
  contact: "접촉",
  proposal: "제안",
  negotiation: "협상",
  closed_won: "성사",
  closed_lost: "실패",
}

const STAGE_COLORS: Record<string, string> = {
  lead: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  contact: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  proposal: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  negotiation: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  closed_won: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  closed_lost: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-gray-500",
  medium: "text-blue-500",
  high: "text-amber-500",
  urgent: "text-red-500",
}

function calcTemperature(customer: Customer): { score: number; label: string; color: string } {
  let score = 0

  // Grade weight (0-30)
  const gradeScores: Record<string, number> = { S: 30, A: 24, B: 16, C: 8, D: 0 }
  score += gradeScores[customer.grade] || 0

  // Activity recency (0-30)
  if (customer.activities.length > 0) {
    const lastActivity = new Date(customer.activities[0].occurred_at)
    const daysSince = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince <= 3) score += 30
    else if (daysSince <= 7) score += 24
    else if (daysSince <= 14) score += 16
    else if (daysSince <= 30) score += 8
    else score += 2
  }

  // Activity frequency (0-20) - last 30 days
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  const recentCount = customer.activities.filter(
    a => new Date(a.occurred_at).getTime() > thirtyDaysAgo
  ).length
  score += Math.min(recentCount * 4, 20)

  // Active deals (0-20)
  const activeDeals = customer.deals.filter(
    d => !["closed_won", "closed_lost"].includes(d.stage)
  )
  if (activeDeals.length > 0) {
    score += Math.min(activeDeals.length * 10, 20)
  }

  if (score >= 80) return { score, label: "HOT", color: "text-red-500" }
  if (score >= 60) return { score, label: "WARM", color: "text-amber-500" }
  if (score >= 30) return { score, label: "COOL", color: "text-blue-500" }
  return { score, label: "COLD", color: "text-gray-400" }
}

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return "방금 전"
  if (diffMin < 60) return `${diffMin}분 전`
  if (diffHour < 24) return `${diffHour}시간 전`
  if (diffDay < 7) return `${diffDay}일 전`
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}주 전`
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatAmount(amount: number) {
  if (amount >= 100000000) return `${(amount / 100000000).toFixed(1)}억`
  if (amount >= 10000) return `${(amount / 10000).toFixed(0)}만`
  return amount.toLocaleString()
}

type Tab = "timeline" | "deals" | "followups"

export function CustomerDetail({ customerId }: { customerId: string }) {
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("timeline")
  const [showEditForm, setShowEditForm] = useState(false)
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [showDealForm, setShowDealForm] = useState(false)
  const [showFollowUpForm, setShowFollowUpForm] = useState(false)
  const [showMeetingCapture, setShowMeetingCapture] = useState(false)
  const [showAIPartner, setShowAIPartner] = useState(false)
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set())
  const [aiTiming, setAiTiming] = useState<{
    recommended_contact_date: string
    recommended_method: string
    reason: string
    talking_points: string[]
    risk_level: string
    risk_reason: string | null
    relationship_health: string
  } | null>(null)
  const [loadingTiming, setLoadingTiming] = useState(false)

  const fetchCustomer = useCallback(async () => {
    try {
      const res = await fetch(`/api/sales/customers/${customerId}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCustomer(data)
    } catch {
      toast.error("고객 정보를 불러올 수 없습니다")
      router.push("/sales")
    } finally {
      setLoading(false)
    }
  }, [customerId, router])

  useEffect(() => {
    fetchCustomer()
  }, [fetchCustomer])

  const handleFollowUpToggle = async (followUp: FollowUp) => {
    const newStatus = followUp.status === "completed" ? "pending" : "completed"
    const res = await fetch(`/api/sales/follow-ups/${followUp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: newStatus,
        completed_at: newStatus === "completed" ? new Date().toISOString() : null,
      }),
    })
    if (res.ok) {
      toast.success(newStatus === "completed" ? "완료 처리되었습니다" : "미완료로 변경되었습니다")
      fetchCustomer()
    }
  }

  const handleDeleteCustomer = async () => {
    if (!confirm("이 고객을 삭제하시겠습니까? 관련된 모든 데이터가 삭제됩니다.")) return
    const res = await fetch(`/api/sales/customers/${customerId}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("고객이 삭제되었습니다")
      router.push("/sales")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-32 bg-muted rounded-xl" />
            <div className="h-64 bg-muted rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!customer) return null

  const fetchAITiming = async () => {
    setLoadingTiming(true)
    try {
      const res = await fetch("/api/sales/ai-timing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: customerId }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAiTiming(data)
    } catch {
      toast.error("AI 분석에 실패했습니다")
    } finally {
      setLoadingTiming(false)
    }
  }

  const temp = calcTemperature(customer)
  const lastActivity = customer.activities[0]
  const pendingFollowUps = customer.follow_ups.filter(f => f.status === "pending" || f.status === "overdue")
  const activeDeals = customer.deals.filter(d => !["closed_won", "closed_lost"].includes(d.stage))
  const totalDealAmount = customer.deals
    .filter(d => d.stage === "closed_won")
    .reduce((sum, d) => sum + d.amount, 0)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border/60">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push("/sales")}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              고객 목록
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAIPartner(true)}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                AI
              </button>
              <button
                onClick={() => setShowEditForm(true)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Edit3 className="h-4 w-4" />
                수정
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Customer Card */}
        <div className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 ${GRADE_COLORS[customer.grade]}`}>
              {customer.grade}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold">{customer.name}</h1>
                <span className={`flex items-center gap-1 text-xs font-bold ${temp.color}`}>
                  <Flame className="h-3.5 w-3.5" />
                  {temp.label}
                  <span className="text-[10px] opacity-70">{temp.score}</span>
                </span>
              </div>
              {(customer.company || customer.role) && (
                <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {customer.company}{customer.role && ` · ${customer.role}`}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2">
                {customer.phone && (
                  <a
                    href={`tel:${customer.phone}`}
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {customer.phone}
                  </a>
                )}
                {customer.email && (
                  <a
                    href={`mailto:${customer.email}`}
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {customer.email}
                  </a>
                )}
              </div>
            </div>
          </div>

          {customer.notes && (
            <p className="text-sm text-muted-foreground mt-3 pl-[72px] leading-relaxed">
              {customer.notes}
            </p>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-border/40">
            <div className="text-center">
              <p className="text-lg font-bold tabular-nums">{customer.activities.length}</p>
              <p className="text-[10px] text-muted-foreground">활동</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold tabular-nums">{activeDeals.length}</p>
              <p className="text-[10px] text-muted-foreground">진행 딜</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold tabular-nums">{pendingFollowUps.length}</p>
              <p className="text-[10px] text-muted-foreground">할 일</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold tabular-nums">
                {totalDealAmount > 0 ? formatAmount(totalDealAmount) : "-"}
              </p>
              <p className="text-[10px] text-muted-foreground">성사 금액</p>
            </div>
          </div>

          {lastActivity && (
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              마지막 연락: {formatRelativeDate(lastActivity.occurred_at)}
              ({ACTIVITY_LABELS[lastActivity.type]})
            </p>
          )}
        </div>

        {/* AI Timing Recommendation */}
        {!aiTiming && (
          <button
            onClick={fetchAITiming}
            disabled={loadingTiming}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-primary/20 bg-primary/5 text-sm text-primary hover:bg-primary/10 transition-all disabled:opacity-50"
          >
            {loadingTiming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loadingTiming ? "AI 분석 중..." : "AI 연락 타이밍 추천"}
          </button>
        )}

        {aiTiming && (
          <div className="bg-card rounded-2xl border border-primary/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                AI 연락 추천
              </p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                aiTiming.relationship_health === "excellent" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" :
                aiTiming.relationship_health === "good" ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" :
                aiTiming.relationship_health === "fair" ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" :
                "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
              }`}>
                관계 {aiTiming.relationship_health === "excellent" ? "최상" :
                       aiTiming.relationship_health === "good" ? "양호" :
                       aiTiming.relationship_health === "fair" ? "보통" : "주의"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] text-muted-foreground">추천 연락일</p>
                <p className="font-medium">{formatDate(aiTiming.recommended_contact_date)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">추천 방법</p>
                <p className="font-medium">{ACTIVITY_LABELS[aiTiming.recommended_method] || aiTiming.recommended_method}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{aiTiming.reason}</p>
            {aiTiming.talking_points.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">대화 포인트</p>
                <ul className="space-y-0.5">
                  {aiTiming.talking_points.map((tp, i) => (
                    <li key={i} className="text-xs flex items-start gap-1.5">
                      <span className="text-primary mt-0.5">-</span>
                      {tp}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {aiTiming.risk_level !== "low" && aiTiming.risk_reason && (
              <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-2">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                {aiTiming.risk_reason}
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          {([
            { key: "timeline", label: "타임라인", count: customer.activities.length },
            { key: "deals", label: "딜", count: customer.deals.length },
            { key: "followups", label: "할 일", count: pendingFollowUps.length },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-all ${
                tab === t.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  tab === t.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "timeline" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowMeetingCapture(true)}
                className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-primary/30 text-sm text-primary hover:bg-primary/5 transition-all"
              >
                <Mic className="h-4 w-4" />
                미팅 캡처
              </button>
              <button
                onClick={() => setShowActivityForm(true)}
                className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border/60 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
              >
                <Plus className="h-4 w-4" />
                활동 기록
              </button>
            </div>

            {customer.activities.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">아직 활동 기록이 없습니다</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-5 top-0 bottom-0 w-px bg-border/60" />

                {customer.activities.map((activity) => {
                  const Icon = ACTIVITY_ICONS[activity.type] || MessageSquare
                  const isExpanded = expandedActivities.has(activity.id)
                  const isLong = activity.content.length > 120

                  return (
                    <div key={activity.id} className="relative pl-12 pb-4">
                      {/* Timeline dot */}
                      <div className="absolute left-3 top-1 w-5 h-5 rounded-full bg-background border-2 border-border flex items-center justify-center">
                        <Icon className="h-2.5 w-2.5 text-muted-foreground" />
                      </div>

                      <div className="bg-card rounded-xl border border-border/60 p-3.5 hover:shadow-sm transition-shadow">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {ACTIVITY_LABELS[activity.type]}
                            </span>
                            {activity.duration_min && (
                              <span className="text-[10px] text-muted-foreground">
                                {activity.duration_min}분
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {formatRelativeDate(activity.occurred_at)}
                          </span>
                        </div>

                        <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
                          !isExpanded && isLong ? "line-clamp-3" : ""
                        }`}>
                          {activity.content}
                        </p>

                        {isLong && (
                          <button
                            onClick={() => {
                              const next = new Set(expandedActivities)
                              isExpanded ? next.delete(activity.id) : next.add(activity.id)
                              setExpandedActivities(next)
                            }}
                            className="flex items-center gap-1 text-xs text-primary mt-1.5 hover:underline"
                          >
                            {isExpanded ? (
                              <>접기 <ChevronUp className="h-3 w-3" /></>
                            ) : (
                              <>더보기 <ChevronDown className="h-3 w-3" /></>
                            )}
                          </button>
                        )}

                        {activity.summary && (
                          <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/40 italic">
                            {activity.summary}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === "deals" && (
          <div className="space-y-3">
            <button
              onClick={() => setShowDealForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border/60 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
            >
              <Plus className="h-4 w-4" />
              딜 추가
            </button>

            {customer.deals.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">아직 딜이 없습니다</p>
              </div>
            ) : (
              customer.deals.map((deal) => (
                <div key={deal.id} className="bg-card rounded-xl border border-border/60 p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{deal.title}</h4>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_COLORS[deal.stage]}`}>
                          {STAGE_LABELS[deal.stage]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          확률 {deal.probability}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold tabular-nums">
                        {deal.amount > 0 ? `${formatAmount(deal.amount)}원` : "-"}
                      </p>
                      {deal.expected_close_date && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1 justify-end">
                          <Calendar className="h-3 w-3" />
                          {formatDate(deal.expected_close_date)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "followups" && (
          <div className="space-y-3">
            <button
              onClick={() => setShowFollowUpForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border/60 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
            >
              <Plus className="h-4 w-4" />
              할 일 추가
            </button>

            {customer.follow_ups.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">할 일이 없습니다</p>
              </div>
            ) : (
              customer.follow_ups.map((followUp) => {
                const isOverdue = followUp.status !== "completed" && new Date(followUp.due_date) < new Date()
                const isDone = followUp.status === "completed"

                return (
                  <div
                    key={followUp.id}
                    className={`bg-card rounded-xl border border-border/60 p-4 hover:shadow-sm transition-all ${
                      isDone ? "opacity-60" : ""
                    } ${isOverdue ? "border-red-300 dark:border-red-800" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleFollowUpToggle(followUp)}
                        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isDone
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-border hover:border-primary"
                        }`}
                      >
                        {isDone && <CheckCircle2 className="h-3 w-3" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-medium ${isDone ? "line-through" : ""}`}>
                            {followUp.title}
                          </h4>
                          {isOverdue && !isDone && (
                            <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                          )}
                        </div>
                        {followUp.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {followUp.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-[10px] ${PRIORITY_COLORS[followUp.priority]}`}>
                            {followUp.priority === "urgent" ? "긴급" :
                             followUp.priority === "high" ? "높음" :
                             followUp.priority === "medium" ? "보통" : "낮음"}
                          </span>
                          <span className={`text-[10px] flex items-center gap-1 ${
                            isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"
                          }`}>
                            <Calendar className="h-3 w-3" />
                            {formatDate(followUp.due_date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      {showEditForm && (
        <CustomerForm
          customer={customer}
          onClose={() => setShowEditForm(false)}
          onSave={() => { setShowEditForm(false); fetchCustomer() }}
          onDelete={handleDeleteCustomer}
        />
      )}

      {showActivityForm && (
        <ActivityForm
          customerId={customerId}
          onClose={() => setShowActivityForm(false)}
          onSave={() => { setShowActivityForm(false); fetchCustomer() }}
        />
      )}

      {showDealForm && (
        <DealForm
          customerId={customerId}
          onClose={() => setShowDealForm(false)}
          onSave={() => { setShowDealForm(false); fetchCustomer() }}
        />
      )}

      {showFollowUpForm && (
        <FollowUpForm
          customerId={customerId}
          onClose={() => setShowFollowUpForm(false)}
          onSave={() => { setShowFollowUpForm(false); fetchCustomer() }}
        />
      )}

      {showMeetingCapture && (
        <MeetingCapture
          customerId={customerId}
          customerName={customer.name}
          onClose={() => setShowMeetingCapture(false)}
          onSave={() => { setShowMeetingCapture(false); fetchCustomer() }}
        />
      )}

      {showAIPartner && (
        <AIPartner
          customerId={customerId}
          customerName={customer.name}
          onClose={() => setShowAIPartner(false)}
        />
      )}
    </div>
  )
}
