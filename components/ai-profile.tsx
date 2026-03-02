"use client"

import { useState, useEffect } from "react"
import { Brain, Sparkles, TrendingUp, Clock, BarChart3, RefreshCw, ArrowLeft, Zap, FileText, Link2, Image, Mic } from "lucide-react"

const typeLabels: Record<string, string> = {
  text: "텍스트",
  link: "링크",
  image: "이미지",
  voice: "음성",
}

const typeIcons: Record<string, React.ReactNode> = {
  text: <FileText className="h-4 w-4" />,
  link: <Link2 className="h-4 w-4" />,
  image: <Image className="h-4 w-4" />,
  voice: <Mic className="h-4 w-4" />,
}

interface AIProfileData {
  interests: { topic: string; count: number }[]
  patterns: {
    peak_day: string
    peak_hour: number
    avg_daily: number
    type_distribution: Record<string, number>
    day_distribution: Record<string, number>
    hour_distribution: Record<number, number>
  }
  thinking_style: string
  style_description: string
  interests_summary: string
  growth_tip: string
  total_items: number
  updated_at: string
}

export function AIProfile() {
  const [profile, setProfile] = useState<AIProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)

  const fetchProfile = () => {
    fetch("/api/ai/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.interests) setProfile(data)
        else setProfile(null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchProfile() }, [])

  const runAnalysis = async () => {
    setAnalyzing(true)
    try {
      const res = await fetch("/api/ai/profile", { method: "POST" })
      const data = await res.json()
      if (data && data.interests) setProfile(data)
    } catch {}
    setAnalyzing(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">로딩 중...</div>
      </div>
    )
  }

  // Empty state - no profile yet
  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl text-foreground mb-3">나의 AI 프로필</h1>
          <p className="text-muted-foreground mb-8">
            AI가 당신의 기록 패턴과 관심사를 분석합니다.<br />
            최소 5개 이상의 항목이 필요합니다.
          </p>
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {analyzing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {analyzing ? "분석 중..." : "분석 시작하기"}
          </button>
        </div>
      </div>
    )
  }

  const maxInterestCount = Math.max(...profile.interests.map(i => i.count), 1)
  const days = ["월", "화", "수", "목", "금", "토", "일"]
  const maxDayCount = Math.max(...days.map(d => profile.patterns.day_distribution[d] || 0), 1)

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <a href="/" className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </a>
            <div>
              <h1 className="font-display text-xl text-foreground flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                나의 AI 프로필
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                마지막 분석: {new Date(profile.updated_at).toLocaleDateString("ko-KR")}
              </p>
            </div>
          </div>
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-50"
            title="재분석"
          >
            <RefreshCw className={`h-4 w-4 ${analyzing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Thinking Style Card */}
        <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg text-foreground">사고 성향</h2>
          </div>
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-2xl font-bold text-primary">{profile.thinking_style}</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{profile.style_description}</p>
          {profile.growth_tip && (
            <div className="mt-3 pt-3 border-t border-primary/10">
              <p className="text-xs text-primary flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                {profile.growth_tip}
              </p>
            </div>
          )}
        </div>

        {/* Interests Summary */}
        {profile.interests_summary && (
          <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-sm mb-6">
            <p className="text-sm text-foreground leading-relaxed">{profile.interests_summary}</p>
          </div>
        )}

        {/* Top Interests */}
        <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm mb-6">
          <h2 className="font-display text-base text-foreground flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-primary" />
            관심 분야 TOP {profile.interests.length}
          </h2>
          <div className="flex flex-col gap-2.5">
            {profile.interests.map((interest, i) => (
              <div key={interest.topic} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-foreground">{interest.topic}</span>
                    <span className="text-xs text-muted-foreground">{interest.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/60"
                      style={{ width: `${(interest.count / maxInterestCount) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Pattern */}
        <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm mb-6">
          <h2 className="font-display text-base text-foreground flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-primary" />
            활동 패턴
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 rounded-xl bg-muted/40 text-center">
              <p className="text-xs text-muted-foreground mb-1">피크 요일</p>
              <p className="text-lg font-bold text-foreground">{profile.patterns.peak_day}요일</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 text-center">
              <p className="text-xs text-muted-foreground mb-1">피크 시간</p>
              <p className="text-lg font-bold text-foreground">{profile.patterns.peak_hour}시</p>
            </div>
          </div>
          {/* Day distribution bars */}
          <div className="flex items-end gap-2 h-24">
            {days.map((day) => {
              const count = profile.patterns.day_distribution[day] || 0
              const height = maxDayCount > 0 ? (count / maxDayCount) * 100 : 0
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex justify-center">
                    <div
                      className={`w-full max-w-[28px] rounded-t-md ${day === profile.patterns.peak_day ? "bg-primary" : "bg-primary/30"}`}
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{day}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm mb-6">
          <h2 className="font-display text-base text-foreground flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-primary" />
            통계 요약
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-muted/40 text-center">
              <p className="text-xs text-muted-foreground mb-1">총 기록</p>
              <p className="text-xl font-bold text-foreground">{profile.total_items}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 text-center">
              <p className="text-xs text-muted-foreground mb-1">일 평균</p>
              <p className="text-xl font-bold text-foreground">{profile.patterns.avg_daily}</p>
            </div>
          </div>
          {/* Type distribution */}
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(profile.patterns.type_distribution).map(([type, count]) => (
              <div key={type} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 text-xs">
                {typeIcons[type]}
                <span className="text-foreground">{typeLabels[type] || type}</span>
                <span className="text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
