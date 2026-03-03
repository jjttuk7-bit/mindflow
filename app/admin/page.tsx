"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Users,
  FileText,
  MessageSquare,
  CheckSquare,
  CreditCard,
  TrendingUp,
  Loader2,
  ShieldAlert,
} from "lucide-react"

interface AdminStats {
  users: { total: number; newWeek: number; newMonth: number; pro: number }
  items: { total: number; recentByType: Record<string, number> }
  todos: { total: number }
  chatSessions: { total: number }
  dailySignups: Record<string, number>
  recentUsers: Array<{ email: string; created_at: string; last_sign_in: string | null }>
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => {
        if (r.status === 403) throw new Error("forbidden")
        if (!r.ok) throw new Error("failed")
        return r.json()
      })
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error === "forbidden") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <ShieldAlert className="h-10 w-10 text-destructive mx-auto" />
          <h1 className="text-lg font-semibold text-foreground">접근 권한 없음</h1>
          <p className="text-sm text-muted-foreground">관리자 권한이 필요합니다.</p>
          <Link href="/" className="text-sm text-primary hover:underline">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">데이터를 불러올 수 없습니다.</p>
      </div>
    )
  }

  const maxSignups = Math.max(...Object.values(stats.dailySignups), 1)

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="font-display text-2xl tracking-tight text-foreground">관리자 대시보드</h1>
            <p className="text-sm text-muted-foreground mt-0.5">DotLine 서비스 현황</p>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard icon={Users} label="전체 사용자" value={stats.users.total} sub={`이번 주 +${stats.users.newWeek}`} />
          <StatCard icon={CreditCard} label="Pro 구독자" value={stats.users.pro} sub={`전환율 ${stats.users.total ? Math.round((stats.users.pro / stats.users.total) * 100) : 0}%`} />
          <StatCard icon={FileText} label="전체 아이템" value={stats.items.total.toLocaleString()} />
          <StatCard icon={MessageSquare} label="AI 채팅" value={stats.chatSessions.total} />
        </div>

        {/* Daily Signups Chart */}
        <div className="rounded-xl border border-border/50 bg-card p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-foreground">일일 가입자 (최근 14일)</h2>
          </div>
          <div className="flex items-end gap-1 h-28">
            {Object.entries(stats.dailySignups).map(([date, count]) => (
              <div key={date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm bg-primary/70 min-h-[2px] transition-all"
                  style={{ height: `${(count / maxSignups) * 100}%` }}
                />
                <span className="text-[9px] text-muted-foreground/50 -rotate-45 origin-top-left whitespace-nowrap">
                  {date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Items Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <h2 className="text-sm font-medium text-foreground mb-3">최근 아이템 (유형별)</h2>
            <div className="space-y-2">
              {Object.entries(stats.items.recentByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground capitalize">{type}</span>
                  <span className="text-sm font-medium text-foreground">{count}</span>
                </div>
              ))}
              {Object.keys(stats.items.recentByType).length === 0 && (
                <p className="text-xs text-muted-foreground">데이터 없음</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium text-foreground">추가 통계</h2>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">할 일</span>
                <span className="text-sm font-medium text-foreground">{stats.todos.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">이번 달 가입</span>
                <span className="text-sm font-medium text-foreground">{stats.users.newMonth}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Users */}
        <div className="rounded-xl border border-border/50 bg-card p-5">
          <h2 className="text-sm font-medium text-foreground mb-3">최근 가입자</h2>
          <div className="space-y-2">
            {stats.recentUsers.map((u) => (
              <div key={u.email} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                <span className="text-sm text-foreground">{u.email}</span>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("ko-KR")}
                  </p>
                  {u.last_sign_in && (
                    <p className="text-[10px] text-muted-foreground/50">
                      마지막 로그인: {new Date(u.last_sign_in).toLocaleDateString("ko-KR")}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {stats.recentUsers.length === 0 && (
              <p className="text-xs text-muted-foreground">가입자 없음</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
