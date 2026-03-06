"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Bell, X, PhoneOff, Clock, TrendingUp,
  AlertTriangle, CheckCircle2, ChevronRight, Flame,
} from "lucide-react"

type Alert = {
  id: string
  type: string
  title: string
  message: string
  priority: string
  status: string
  action_url: string | null
  created_at: string
  customers: {
    id: string
    name: string
    grade: string
    company: string | null
  } | null
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  no_contact: PhoneOff,
  follow_up_due: Clock,
  deal_deadline: TrendingUp,
  relationship_cool: Flame,
}

const TYPE_LABELS: Record<string, string> = {
  no_contact: "연락 필요",
  follow_up_due: "기한 초과",
  deal_deadline: "딜 마감",
  relationship_cool: "관계 냉각",
}

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "border-l-red-500 bg-red-50/50 dark:bg-red-950/20",
  high: "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20",
  medium: "border-l-blue-500",
  low: "border-l-gray-300",
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000)

  if (diffMin < 60) return `${diffMin}분 전`
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}시간 전`
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
}

export function NotificationPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/sales/notifications?limit=30")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAlerts(data.alerts)
    } catch {
      // silent fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) fetchAlerts()
  }, [isOpen, fetchAlerts])

  const handleCheck = async () => {
    setChecking(true)
    try {
      const res = await fetch("/api/sales/notifications/check", { method: "POST" })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data.generated > 0) {
        toast.success(`${data.generated}개 새 알림이 생성되었습니다`)
        fetchAlerts()
      } else {
        toast.info("새로운 알림이 없습니다")
      }
    } catch {
      toast.error("알림 확인에 실패했습니다")
    } finally {
      setChecking(false)
    }
  }

  const handleDismiss = async (id: string) => {
    await fetch("/api/sales/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id], status: "dismissed" }),
    })
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const handleAction = async (alert: Alert) => {
    // Mark as actioned
    await fetch("/api/sales/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [alert.id], status: "actioned" }),
    })

    if (alert.action_url) {
      router.push(alert.action_url)
      onClose()
    }
  }

  const handleMarkAllRead = async () => {
    const unreadIds = alerts.filter(a => a.status === "unread").map(a => a.id)
    if (unreadIds.length === 0) return

    await fetch("/api/sales/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: unreadIds, status: "read" }),
    })
    setAlerts(prev => prev.map(a => ({ ...a, status: a.status === "unread" ? "read" : a.status })))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pt-16">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-card rounded-2xl border border-border/60 shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/60 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <h3 className="font-semibold text-sm">알림</h3>
            {alerts.filter(a => a.status === "unread").length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500 text-white font-bold">
                {alerts.filter(a => a.status === "unread").length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCheck}
              disabled={checking}
              className="text-xs text-primary hover:underline disabled:opacity-50 px-2 py-1"
            >
              {checking ? "확인 중..." : "새로고침"}
            </button>
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
            >
              모두 읽음
            </button>
            <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Alert List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-10 w-10 text-emerald-500/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">알림이 없습니다</p>
              <button
                onClick={handleCheck}
                disabled={checking}
                className="mt-3 text-xs text-primary hover:underline"
              >
                지금 확인하기
              </button>
            </div>
          ) : (
            <div className="py-1">
              {alerts.map((alert) => {
                const Icon = TYPE_ICONS[alert.type] || AlertTriangle
                const isUnread = alert.status === "unread"

                return (
                  <div
                    key={alert.id}
                    className={`border-l-4 px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer ${
                      PRIORITY_STYLES[alert.priority] || ""
                    } ${isUnread ? "bg-accent/30" : ""}`}
                    onClick={() => handleAction(alert)}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                        alert.priority === "urgent" ? "text-red-500" :
                        alert.priority === "high" ? "text-amber-500" :
                        "text-muted-foreground"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm truncate ${isUnread ? "font-semibold" : ""}`}>
                            {alert.title}
                          </p>
                          {isUnread && (
                            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {alert.message}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-muted-foreground/60">
                            {formatTime(alert.created_at)}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDismiss(alert.id) }}
                            className="text-[10px] text-muted-foreground hover:text-foreground"
                          >
                            닫기
                          </button>
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 flex-shrink-0 mt-0.5" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Badge component for the header
export function NotificationBadge({
  onClick,
}: {
  onClick: () => void
}) {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/sales/notifications?limit=1")
        if (!res.ok) return
        const data = await res.json()
        setUnreadCount(data.unread_count)
      } catch {
        // silent
      }
    }
    check()
    const interval = setInterval(check, 60_000) // Check every minute
    return () => clearInterval(interval)
  }, [])

  return (
    <button
      onClick={onClick}
      className="relative h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      title="알림"
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  )
}
