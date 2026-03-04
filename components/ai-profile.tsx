"use client"

import { useState, useEffect } from "react"
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Clock,
  BarChart3,
  RefreshCw,
  ArrowLeft,
  Zap,
  FileText,
  Link2,
  Image,
  Mic,
  Lock,
  Compass,
  Target,
  Palette,
  Search,
  Users,
  Gauge,
} from "lucide-react"
import { DotLineLogo } from "@/components/dotline-logo"
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"
import type { AIProfileData, AIProfileSnapshot } from "@/lib/supabase/types"

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

const dimensionLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  explorer: { label: "탐구", icon: <Compass className="h-3.5 w-3.5" /> },
  executor: { label: "실행", icon: <Target className="h-3.5 w-3.5" /> },
  creator: { label: "창작", icon: <Palette className="h-3.5 w-3.5" /> },
  analyst: { label: "분석", icon: <Search className="h-3.5 w-3.5" /> },
  connector: { label: "소통", icon: <Users className="h-3.5 w-3.5" /> },
}

// Free tier partial data type
interface FreeProfileData {
  interests?: { topic: string; count: number }[]
  patterns?: AIProfileData["patterns"]
  total_items?: number
  updated_at?: string
  _plan: "free"
}

type ProfileResponse = AIProfileData | FreeProfileData

function isFullProfile(data: ProfileResponse): data is AIProfileData {
  return "thinking_style" in data && !("_plan" in data)
}

// ─── ProGate ──────────────────────────────────────────────────────

function ProGate({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px] z-10 rounded-2xl flex flex-col items-center justify-center gap-2">
        <Lock className="h-5 w-5 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground/70 font-medium">Pro 기능</p>
        <a
          href="/settings"
          className="text-xs text-primary hover:underline"
        >
          업그레이드하여 잠금 해제
        </a>
      </div>
      <div className="opacity-30 pointer-events-none">{children}</div>
    </div>
  )
}

// ─── DimensionsRadar ──────────────────────────────────────────────

function DimensionsRadar({ dimensions }: { dimensions: AIProfileData["dimensions"] }) {
  const data = Object.entries(dimensions).map(([key, value]) => ({
    subject: dimensionLabels[key]?.label || key,
    value,
    fullMark: 100,
  }))

  const topDimension = Object.entries(dimensions).sort((a, b) => b[1] - a[1])[0]
  const topLabel = dimensionLabels[topDimension[0]]?.label || topDimension[0]

  return (
    <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm">
      <h2 className="font-display text-base text-foreground flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-primary" />
        5축 성격 분석
      </h2>
      <p className="text-sm text-primary font-medium mb-3">
        당신은 <span className="text-lg">{topLabel}형</span>입니다
      </p>
      <div className="w-full" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fontSize: 12, fill: "var(--foreground)" }}
            />
            <Radar
              dataKey="value"
              stroke="var(--primary)"
              fill="var(--primary)"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {Object.entries(dimensions).map(([key, value]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {dimensionLabels[key]?.icon}
            <span>{dimensionLabels[key]?.label}</span>
            <span className="font-medium text-foreground">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── TimePersonaCard ──────────────────────────────────────────────

function TimePersonaCard({
  persona,
  hourDist,
}: {
  persona: AIProfileData["time_persona"]
  hourDist: Record<number, number>
}) {
  const chartData = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h}`,
    count: hourDist[h] || 0,
  }))
  const maxCount = Math.max(...chartData.map((d) => d.count), 1)

  return (
    <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm">
      <h2 className="font-display text-base text-foreground flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-primary" />
        시간대 페르소나
      </h2>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{persona.emoji}</span>
        <div>
          <p className="text-lg font-bold text-foreground">{persona.label}</p>
          <p className="text-sm text-muted-foreground">{persona.description}</p>
        </div>
      </div>
      {/* 24h mini bar chart */}
      <div className="h-16 flex items-end gap-[2px]">
        {chartData.map((d) => (
          <div
            key={d.hour}
            className="flex-1 rounded-t-sm bg-primary/40 transition-all"
            style={{ height: `${Math.max((d.count / maxCount) * 100, 2)}%` }}
            title={`${d.hour}시: ${d.count}건`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-muted-foreground">0시</span>
        <span className="text-[10px] text-muted-foreground">6시</span>
        <span className="text-[10px] text-muted-foreground">12시</span>
        <span className="text-[10px] text-muted-foreground">18시</span>
        <span className="text-[10px] text-muted-foreground">23시</span>
      </div>
    </div>
  )
}

// ─── DiversityScoreCard ───────────────────────────────────────────

function DiversityScoreCard({ data }: { data: AIProfileData["diversity_score"] }) {
  const deg = (data.score / 100) * 360
  const color = data.score >= 80 ? "var(--sage)"
    : data.score >= 60 ? "var(--primary)"
    : data.score >= 40 ? "var(--amber-accent)"
    : "var(--muted-foreground)"

  return (
    <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm">
      <h2 className="font-display text-base text-foreground flex items-center gap-2 mb-4">
        <Gauge className="h-4 w-4 text-primary" />
        콘텐츠 다양성
      </h2>
      <div className="flex items-center gap-6">
        <div
          className="relative w-24 h-24 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: `conic-gradient(${color} ${deg}deg, var(--muted) ${deg}deg)`,
          }}
        >
          <div className="w-[76px] h-[76px] rounded-full bg-card flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl font-display tabular-nums" style={{ color }}>
                {data.score}
              </p>
              <p className="text-[10px] text-muted-foreground">{data.label}</p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{data.label}</p>
          <p className="text-xs text-muted-foreground">
            고유 태그 {data.unique_tags}개 · 유형 {data.unique_types}가지
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── ProfileHistorySection ────────────────────────────────────────

function ProfileHistorySection({ history }: { history: AIProfileSnapshot[] }) {
  if (history.length < 2) return null

  const dimKeys = ["explorer", "executor", "creator", "analyst", "connector"] as const
  const colors = ["var(--primary)", "var(--sage)", "var(--terracotta)", "var(--amber-accent)", "var(--dusty-rose)"]

  const chartData = history.map((s) => ({
    date: s.date.slice(5), // MM-DD
    ...s.dimensions,
  }))

  // Compare latest vs previous
  const latest = history[history.length - 1]
  const prev = history[history.length - 2]

  // Topic changes
  const prevTopics = new Set(prev.top_topics)
  const latestTopics = new Set(latest.top_topics)
  const newTopics = latest.top_topics.filter((t) => !prevTopics.has(t))
  const droppedTopics = prev.top_topics.filter((t) => !latestTopics.has(t))

  return (
    <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm">
      <h2 className="font-display text-base text-foreground flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-primary" />
        성장 추적
      </h2>

      {/* Mini line chart */}
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis domain={[0, 100]} hide />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            {dimKeys.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[i]}
                strokeWidth={2}
                dot={{ r: 3 }}
                name={dimensionLabels[key]?.label}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Dimension changes */}
      <div className="grid grid-cols-5 gap-2 mt-4">
        {dimKeys.map((key) => {
          const diff = latest.dimensions[key] - prev.dimensions[key]
          return (
            <div key={key} className="text-center">
              <p className="text-[10px] text-muted-foreground">{dimensionLabels[key]?.label}</p>
              <p className={`text-sm font-bold ${diff > 0 ? "text-sage" : diff < 0 ? "text-dusty-rose" : "text-muted-foreground"}`}>
                {diff > 0 ? "+" : ""}{diff}
              </p>
            </div>
          )
        })}
      </div>

      {/* Topic changes */}
      {(newTopics.length > 0 || droppedTopics.length > 0) && (
        <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 gap-3">
          {newTopics.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-sage" />
                새 관심사
              </p>
              <div className="flex flex-wrap gap-1">
                {newTopics.map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded-full text-[11px] bg-sage/10 text-sage">{t}</span>
                ))}
              </div>
            </div>
          )}
          {droppedTopics.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-dusty-rose" />
                감소 관심사
              </p>
              <div className="flex flex-wrap gap-1">
                {droppedTopics.map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded-full text-[11px] bg-dusty-rose/10 text-dusty-rose">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────

export function AIProfile() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)

  const fetchProfile = () => {
    fetch("/api/ai/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data && (data.interests || data.patterns || data._plan)) setProfile(data)
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
      if (res.status === 403) {
        // Free user tried to analyze
        return
      }
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

  // Empty state - no profile at all
  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <a href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="h-4 w-4" />
            돌아가기
          </a>
          <div className="text-center pt-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <DotLineLogo className="h-8 w-8 text-primary" />
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
      </div>
    )
  }

  // TODO: 테스트 후 플랜 체크 복원
  const isFree = false // "_plan" in profile && profile._plan === "free"
  const full = (isFullProfile(profile) ? profile : null) as AIProfileData | null

  const interests = profile.interests || []
  const patterns = profile.patterns || null
  const totalItems = ("total_items" in profile ? profile.total_items : 0) || 0
  const maxInterestCount = Math.max(...interests.map((i) => i.count), 1)
  const days = ["월", "화", "수", "목", "금", "토", "일"]
  const maxDayCount = patterns ? Math.max(...days.map((d) => patterns.day_distribution[d] || 0), 1) : 1

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
                <DotLineLogo className="h-5 w-5 text-primary" />
                나의 AI 프로필
              </h1>
              {full?.updated_at && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  마지막 분석: {new Date(full.updated_at).toLocaleDateString("ko-KR")}
                </p>
              )}
            </div>
          </div>
          {!isFree && (
            <button
              onClick={runAnalysis}
              disabled={analyzing}
              className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-50"
              title="재분석"
            >
              <RefreshCw className={`h-4 w-4 ${analyzing ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>

        {/* 1. Thinking Style Card (Pro) */}
        {full ? (
          <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg text-foreground">사고 성향</h2>
            </div>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-2xl font-bold text-primary">{full.thinking_style}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{full.style_description}</p>
            {full.growth_tip && (
              <div className="mt-3 pt-3 border-t border-primary/10">
                <p className="text-xs text-primary flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  {full.growth_tip}
                </p>
              </div>
            )}
          </div>
        ) : isFree ? (
          <ProGate>
            <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg text-foreground">사고 성향</h2>
              </div>
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-2xl font-bold text-primary">분석형</span>
              </div>
              <p className="text-sm text-muted-foreground">AI가 분석한 사고 성향과 성장 팁을 확인하세요.</p>
            </div>
          </ProGate>
        ) : null}

        {/* 2. 5-Axis Radar Chart (Pro) */}
        {full?.dimensions ? (
          <div className="mb-6">
            <DimensionsRadar dimensions={full.dimensions} />
          </div>
        ) : isFree ? (
          <div className="mb-6">
            <ProGate>
              <DimensionsRadar dimensions={{ explorer: 70, executor: 55, creator: 60, analyst: 80, connector: 45 }} />
            </ProGate>
          </div>
        ) : null}

        {/* 3. Time Persona (Pro) */}
        {full?.time_persona && patterns ? (
          <div className="mb-6">
            <TimePersonaCard persona={full.time_persona} hourDist={patterns.hour_distribution} />
          </div>
        ) : isFree && patterns ? (
          <div className="mb-6">
            <ProGate>
              <TimePersonaCard
                persona={{ label: "아침형 플래너", emoji: "🌅", description: "AI가 분석한 시간대 페르소나를 확인하세요." }}
                hourDist={patterns.hour_distribution}
              />
            </ProGate>
          </div>
        ) : null}

        {/* 4. Diversity Score (Pro) */}
        {full?.diversity_score ? (
          <div className="mb-6">
            <DiversityScoreCard data={full.diversity_score} />
          </div>
        ) : isFree ? (
          <div className="mb-6">
            <ProGate>
              <DiversityScoreCard data={{ score: 65, label: "균형 잡힌 학습자", unique_tags: 12, unique_types: 3 }} />
            </ProGate>
          </div>
        ) : null}

        {/* 5. Interests Summary */}
        {full?.interests_summary && (
          <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-sm mb-6">
            <p className="text-sm text-foreground leading-relaxed">{full.interests_summary}</p>
          </div>
        )}

        {/* 6. Top Interests */}
        {interests.length > 0 && (
          <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm mb-6">
            <h2 className="font-display text-base text-foreground flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-primary" />
              관심 분야 TOP {interests.length}
            </h2>
            <div className="flex flex-col gap-2.5">
              {interests.map((interest, i) => (
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
        )}

        {/* 7. Activity Pattern */}
        {patterns && (
          <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm mb-6">
            <h2 className="font-display text-base text-foreground flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-primary" />
              활동 패턴
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 rounded-xl bg-muted/40 text-center">
                <p className="text-xs text-muted-foreground mb-1">피크 요일</p>
                <p className="text-lg font-bold text-foreground">{patterns.peak_day}요일</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 text-center">
                <p className="text-xs text-muted-foreground mb-1">피크 시간</p>
                <p className="text-lg font-bold text-foreground">{patterns.peak_hour}시</p>
              </div>
            </div>
            {/* Day distribution bars */}
            <div className="flex items-end gap-2 h-24">
              {days.map((day) => {
                const count = patterns.day_distribution[day] || 0
                const height = maxDayCount > 0 ? (count / maxDayCount) * 100 : 0
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex justify-center">
                      <div
                        className={`w-full max-w-[28px] rounded-t-md ${day === patterns.peak_day ? "bg-primary" : "bg-primary/30"}`}
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{day}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 8. Stats */}
        <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm mb-6">
          <h2 className="font-display text-base text-foreground flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-primary" />
            통계 요약
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-muted/40 text-center">
              <p className="text-xs text-muted-foreground mb-1">총 기록</p>
              <p className="text-xl font-bold text-foreground">{totalItems}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 text-center">
              <p className="text-xs text-muted-foreground mb-1">일 평균</p>
              <p className="text-xl font-bold text-foreground">{patterns?.avg_daily || 0}</p>
            </div>
          </div>
          {/* Type distribution */}
          {patterns?.type_distribution && (
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(patterns.type_distribution).map(([type, count]) => (
                <div key={type} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 text-xs">
                  {typeIcons[type]}
                  <span className="text-foreground">{typeLabels[type] || type}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 9. Profile History (Pro, >= 2 snapshots) */}
        {full?.history && full.history.length >= 2 && (
          <div className="mb-6">
            <ProfileHistorySection history={full.history} />
          </div>
        )}
      </div>
    </div>
  )
}
