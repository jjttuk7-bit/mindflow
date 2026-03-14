"use client"

import type {
  InsightReportData,
  HourlyHeatmapData,
  StreakSnapshotData,
  ProductivityScoreData,
  MoMComparisonData,
  WeeklyBreakdownData,
  WeeklyInsightData,
} from "@/lib/supabase/types"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  Link,
  ListTodo,
  Pin,
  CheckCircle2,
  Circle,
  Sparkles,
  Lightbulb,
  BarChart3,
  Clock,
  Flame,
  Gauge,
  ArrowUpDown,
  CalendarDays,
  Recycle,
  Heart,
  Ghost,
} from "lucide-react"

const TYPE_COLORS: Record<string, string> = {
  text: "var(--chart-1)",
  link: "var(--chart-2)",
  image: "var(--chart-3)",
  voice: "var(--chart-4)",
}

const SOURCE_COLORS: Record<string, string> = {
  web: "var(--chart-1)",
  telegram: "var(--chart-2)",
  api: "var(--chart-4)",
}

const HEATMAP_LEVELS = [
  "bg-muted/40",
  "bg-primary/20",
  "bg-primary/40",
  "bg-primary/60",
  "bg-primary/80",
]

function getHeatmapLevel(count: number, max: number): string {
  if (count === 0) return HEATMAP_LEVELS[0]
  const ratio = count / max
  if (ratio < 0.25) return HEATMAP_LEVELS[1]
  if (ratio < 0.5) return HEATMAP_LEVELS[2]
  if (ratio < 0.75) return HEATMAP_LEVELS[3]
  return HEATMAP_LEVELS[4]
}


function SectionCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground/80 mb-4">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  )
}

// ─── Hourly Heatmap Section ────────────────────────────────────────

function getTimeBadge(peakHour: number): { label: string; emoji: string } {
  if (peakHour >= 5 && peakHour < 12) return { label: "Early Bird", emoji: "🌅" }
  if (peakHour >= 12 && peakHour < 17) return { label: "Afternoon Worker", emoji: "☀️" }
  if (peakHour >= 17 && peakHour < 21) return { label: "Evening Thinker", emoji: "🌆" }
  return { label: "Night Owl", emoji: "🌙" }
}

function HourlyHeatmapSection({ data }: { data: HourlyHeatmapData }) {
  const chartData = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h}`,
    count: data.hourly_counts[String(h)] || 0,
  }))

  const badge = getTimeBadge(data.peak_hour)

  return (
    <SectionCard title="시간대별 활동" icon={<Clock className="h-4 w-4 text-primary" />}>
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary font-medium">
          {badge.emoji} {badge.label}
        </span>
        <span className="text-xs text-muted-foreground">
          피크 시간: {data.peak_hour}:00 ({data.peak_count}건)
        </span>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chartData}>
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            interval={2}
          />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: unknown) => [`${value}건`, "기록"]}
            labelFormatter={(label: unknown) => `${label}:00`}
          />
          <Bar dataKey="count" radius={[2, 2, 0, 0]} fill="var(--primary)" opacity={0.7} />
        </BarChart>
      </ResponsiveContainer>
    </SectionCard>
  )
}

// ─── Streak Section ────────────────────────────────────────────────

function StreakSection({ data }: { data: StreakSnapshotData }) {
  return (
    <SectionCard title="스트릭" icon={<Flame className="h-4 w-4 text-terracotta" />}>
      <div className="flex items-center gap-6 mb-4">
        <div className="text-center">
          <p className="text-4xl font-display text-terracotta tabular-nums">
            {data.current_streak}
          </p>
          <p className="text-xs text-muted-foreground mt-1">현재 스트릭</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-display text-foreground/60 tabular-nums">
            {data.longest_streak}
          </p>
          <p className="text-xs text-muted-foreground mt-1">최장 스트릭</p>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs text-muted-foreground">활동률</p>
          <span className="text-xs text-muted-foreground tabular-nums">
            {data.total_active_days}일 활동 ({data.active_rate_percent}%)
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-terracotta transition-all"
            style={{ width: `${data.active_rate_percent}%` }}
          />
        </div>
      </div>
    </SectionCard>
  )
}

// ─── Productivity Score Section (Pro) ──────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 80) return "var(--sage)"
  if (score >= 60) return "var(--primary)"
  if (score >= 40) return "var(--amber-accent)"
  return "var(--muted-foreground)"
}

function ProductivityScoreSection({ data }: { data: ProductivityScoreData }) {
  const color = getScoreColor(data.score)
  const deg = (data.score / 100) * 360

  return (
    <SectionCard title="생산성 점수" icon={<Gauge className="h-4 w-4 text-primary" />}>
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
              <p className="text-ui-xs text-muted-foreground">{data.label}</p>
            </div>
          </div>
        </div>
        {data.factors.length > 0 && (
          <ul className="space-y-1.5 flex-1">
            {data.factors.map((factor, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-foreground/70">
                <span className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: color }} />
                {factor}
              </li>
            ))}
          </ul>
        )}
      </div>
    </SectionCard>
  )
}

// ─── MoM Comparison Section (Pro, monthly only) ────────────────────

function MoMComparisonSection({ data }: { data: MoMComparisonData }) {
  const isUp = data.change_percent > 0
  const isDown = data.change_percent < 0

  return (
    <SectionCard title="전월 대비" icon={<ArrowUpDown className="h-4 w-4 text-primary" />}>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="rounded-lg bg-muted/40 p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">전월</p>
          <p className="text-2xl font-display text-foreground/60 tabular-nums">
            {data.previous_total}
          </p>
        </div>
        <div className="rounded-lg bg-muted/40 p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">이번 달</p>
          <p className="text-2xl font-display text-foreground tabular-nums">
            {data.current_total}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center mb-4">
        <span
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
            isUp
              ? "bg-sage/10 text-sage"
              : isDown
                ? "bg-dusty-rose/10 text-dusty-rose"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : isDown ? <TrendingDown className="h-3.5 w-3.5" /> : null}
          {data.change_percent > 0 ? "+" : ""}{data.change_percent}%
        </span>
      </div>
      {(data.new_topics.length > 0 || data.dropped_topics.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {data.new_topics.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-sage" />
                새로운 토픽
              </p>
              <div className="flex flex-wrap gap-1.5">
                {data.new_topics.map((t) => (
                  <span key={t} className="inline-flex items-center px-2 py-0.5 rounded-full text-ui-sm bg-sage/10 text-sage">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
          {data.dropped_topics.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-dusty-rose" />
                사라진 토픽
              </p>
              <div className="flex flex-wrap gap-1.5">
                {data.dropped_topics.map((t) => (
                  <span key={t} className="inline-flex items-center px-2 py-0.5 rounded-full text-ui-sm bg-dusty-rose/10 text-dusty-rose">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  )
}

// ─── Weekly Breakdown Section (monthly only) ───────────────────────

function WeeklyBreakdownSection({ data }: { data: WeeklyBreakdownData[] }) {
  if (data.length === 0) return null

  const maxCaptures = Math.max(...data.map((w) => w.total_captures), 1)
  const mostActiveIdx = data.reduce((best, w, i) =>
    w.total_captures > data[best].total_captures ? i : best, 0)

  function formatShortDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00")
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  return (
    <SectionCard title="주간 분석" icon={<CalendarDays className="h-4 w-4 text-primary" />}>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {data.map((week, i) => {
          const isTop = i === mostActiveIdx
          const typeEntries = Object.entries(week.by_type)
          const total = week.total_captures || 1

          return (
            <div
              key={week.week_start}
              className={`flex-shrink-0 w-36 rounded-lg p-3 border transition-colors ${
                isTop
                  ? "border-primary/30 bg-primary/5"
                  : "border-border/40 bg-muted/20"
              }`}
            >
              <p className="text-ui-sm text-muted-foreground mb-1">
                {formatShortDate(week.week_start)} - {formatShortDate(week.week_end)}
              </p>
              <p className={`text-2xl font-display tabular-nums mb-2 ${isTop ? "text-primary" : "text-foreground/70"}`}>
                {week.total_captures}
              </p>
              {/* Mini type bar */}
              <div className="h-1.5 rounded-full overflow-hidden flex">
                {typeEntries.map(([type, count]) => (
                  <div
                    key={type}
                    className="h-full"
                    style={{
                      width: `${(count / total) * 100}%`,
                      backgroundColor: TYPE_COLORS[type] || "var(--chart-5)",
                    }}
                  />
                ))}
              </div>
              {week.top_projects.length > 0 && (
                <p className="text-ui-xs text-muted-foreground/60 mt-2 truncate">
                  {week.top_projects[0]}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

// ─── Stats Section (shared) ────────────────────────────────────────

function StatsSection({
  stats,
  periodLabel,
}: {
  stats: InsightReportData["stats"]
  periodLabel: string
}) {
  const typeData = Object.entries(stats.by_type).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    fill: TYPE_COLORS[name] || "var(--chart-5)",
  }))

  const sourceData = Object.entries(stats.by_source).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    fill: SOURCE_COLORS[name] || "var(--chart-5)",
  }))

  const heatmapEntries = Object.entries(stats.daily_heatmap)
  const maxHeatmapValue = Math.max(...heatmapEntries.map(([, v]) => v), 1)

  const sortedDays = heatmapEntries.map(([d]) => d).sort()
  const firstDay = sortedDays.length > 0 ? new Date(sortedDays[0]) : new Date()
  const startOfMonth = new Date(firstDay.getFullYear(), firstDay.getMonth(), 1)
  const daysInMonth = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate()
  const startDow = startOfMonth.getDay()

  const calendarCells: Array<{ date: string; count: number } | null> = []
  for (let i = 0; i < startDow; i++) {
    calendarCells.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    calendarCells.push({ date: dateStr, count: stats.daily_heatmap[dateStr] || 0 })
  }

  const todoTotal = stats.todos.completed + stats.todos.pending
  const todoPercent = todoTotal > 0 ? Math.round((stats.todos.completed / todoTotal) * 100) : 0

  return (
    <SectionCard title="활동" icon={<BarChart3 className="h-4 w-4 text-primary" />}>
      <div className="text-center mb-6">
        <p className="text-5xl font-display text-primary tabular-nums">
          {stats.total_captures}
        </p>
        <p className="text-sm text-muted-foreground mt-1">{periodLabel} 총 기록</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {typeData.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3">유형별</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={typeData}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {typeData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {sourceData.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3">소스별</p>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2">
              {sourceData.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: s.fill }}
                  />
                  {s.name} ({s.value})
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {calendarCells.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-medium text-muted-foreground mb-3">일별 활동</p>
          <div className="grid grid-cols-7 gap-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="text-ui-xs text-muted-foreground/50 text-center font-medium">
                {d}
              </div>
            ))}
            {calendarCells.map((cell, i) =>
              cell === null ? (
                <div key={`empty-${i}`} className="aspect-square" />
              ) : (
                <div
                  key={cell.date}
                  className={`aspect-square rounded-sm ${getHeatmapLevel(cell.count, maxHeatmapValue)} transition-colors`}
                  title={`${cell.date}: ${cell.count} captures`}
                />
              )
            )}
          </div>
        </div>
      )}

      {stats.top_projects.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-medium text-muted-foreground mb-2">주요 프로젝트</p>
          <div className="flex flex-wrap gap-2">
            {stats.top_projects.map((name) => (
              <span
                key={name}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary font-medium"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {todoTotal > 0 && (
        <div className="mt-6">
          <p className="text-xs font-medium text-muted-foreground mb-2">할 일 진행</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-sage transition-all"
                style={{ width: `${todoPercent}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {stats.todos.completed}/{todoTotal}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-sage" />
              {stats.todos.completed} 완료
            </span>
            <span className="flex items-center gap-1">
              <Circle className="h-3 w-3" />
              {stats.todos.pending} 진행 중
            </span>
          </div>
        </div>
      )}
    </SectionCard>
  )
}

// ─── Reminders Section ─────────────────────────────────────────────

function RemindersSection({ reminders }: { reminders: InsightReportData["reminders"] }) {
  return (
    <SectionCard title="Reminders" icon={<Pin className="h-4 w-4 text-dusty-rose" />}>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-muted/40 p-3 text-center">
          <Link className="h-4 w-4 mx-auto text-sage mb-1" />
          <p className="text-2xl font-display text-foreground tabular-nums">
            {reminders.unread_links}
          </p>
          <p className="text-ui-sm text-muted-foreground">Unread Links</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-3 text-center">
          <ListTodo className="h-4 w-4 mx-auto text-terracotta mb-1" />
          <p className="text-2xl font-display text-foreground tabular-nums">
            {reminders.overdue_todos}
          </p>
          <p className="text-ui-sm text-muted-foreground">Overdue TODOs</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-3 text-center">
          <Pin className="h-4 w-4 mx-auto text-amber-accent mb-1" />
          <p className="text-2xl font-display text-foreground tabular-nums">
            {reminders.stale_pins}
          </p>
          <p className="text-ui-sm text-muted-foreground">Stale Pins</p>
        </div>
      </div>

      {reminders.items.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {reminders.items.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-xs text-foreground/60 px-2 py-1.5 rounded-lg hover:bg-muted/30 transition-colors"
            >
              <span className="truncate flex-1 mr-2">{item.title}</span>
              <span className="text-muted-foreground/50 tabular-nums flex-shrink-0">
                {item.age_days}d ago
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

// ─── Digest Section ────────────────────────────────────────────────

function DigestSection({
  digest,
  title,
}: {
  digest: { one_liner: string; key_insights: string[]; full_summary: string }
  title: string
}) {
  return (
    <SectionCard title={title} icon={<Sparkles className="h-4 w-4 text-primary" />}>
      {digest.one_liner && (
        <p className="text-lg font-display text-foreground mb-4 leading-snug">
          &ldquo;{digest.one_liner}&rdquo;
        </p>
      )}

      {digest.key_insights.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">주요 인사이트</p>
          <ul className="space-y-2">
            {digest.key_insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground/70">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {digest.full_summary && (
        <p className="text-sm text-foreground/70 leading-relaxed">{digest.full_summary}</p>
      )}
    </SectionCard>
  )
}

// ─── Interests Section (Pro, monthly only) ─────────────────────────

function InterestsSection({ interests }: { interests: InsightReportData["interests"] }) {
  return (
    <SectionCard title="관심사" icon={<Lightbulb className="h-4 w-4 text-amber-accent" />}>
      {interests.top_topics.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">주요 토픽</p>
          <div className="flex flex-wrap gap-2">
            {interests.top_topics.map((topic) => (
              <span
                key={topic}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-amber-accent/10 text-amber-accent font-medium"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        {interests.trending_up.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-sage" />
              상승 중
            </p>
            <ul className="space-y-1">
              {interests.trending_up.map((item) => (
                <li key={item} className="text-xs text-foreground/70 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-sage flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
        {interests.trending_down.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-dusty-rose" />
              하락 중
            </p>
            <ul className="space-y-1">
              {interests.trending_down.map((item) => (
                <li key={item} className="text-xs text-foreground/70 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-dusty-rose flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {interests.summary && (
        <p className="text-sm text-foreground/70 leading-relaxed">{interests.summary}</p>
      )}
    </SectionCard>
  )
}

// ─── Utilization Section ───────────────────────────────────────────

function UtilizationSection({ data }: { data: NonNullable<WeeklyInsightData["utilization"]> }) {
  const deg = (data.rate / 100) * 360
  const color = data.rate >= 70 ? "var(--sage)" : data.rate >= 40 ? "var(--primary)" : "var(--amber-accent)"

  return (
    <SectionCard title="활용률" icon={<Recycle className="h-4 w-4 text-sage" />}>
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
                {data.rate}%
              </p>
              <p className="text-ui-xs text-muted-foreground">활용률</p>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">아카이브</span>
            <span className="text-foreground/70 tabular-nums">{data.archived}개</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">연결</span>
            <span className="text-foreground/70 tabular-nums">{data.connected}개</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">할 일 완료</span>
            <span className="text-foreground/70 tabular-nums">{data.todos_completed}개</span>
          </div>
          <div className="border-t border-border/40 pt-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">전체 아이템</span>
            <span className="text-foreground/70 tabular-nums">{data.total_items}개</span>
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

// ─── Knowledge Health Section ─────────────────────────────────────

const HEALTH_FACTOR_LABELS: Record<string, { label: string; max: number }> = {
  capture_consistency: { label: "캡처 꾸준함", max: 25 },
  organization: { label: "정리 상태", max: 25 },
  utilization: { label: "활용률", max: 20 },
  diversity: { label: "다양성", max: 15 },
  connectivity: { label: "연결성", max: 15 },
}

function KnowledgeHealthSection({ data }: { data: NonNullable<WeeklyInsightData["knowledge_health"]> }) {
  const deg = (data.score / 100) * 360
  const color = data.score >= 80 ? "var(--sage)" : data.score >= 60 ? "var(--primary)" : data.score >= 40 ? "var(--amber-accent)" : "var(--dusty-rose)"

  return (
    <SectionCard title="지식 관리 건강 점수" icon={<Heart className="h-4 w-4 text-dusty-rose" />}>
      <div className="flex items-center gap-6 mb-5">
        <div
          className="relative w-28 h-28 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: `conic-gradient(${color} ${deg}deg, var(--muted) ${deg}deg)`,
          }}
        >
          <div className="w-[88px] h-[88px] rounded-full bg-card flex items-center justify-center">
            <div className="text-center">
              <p className="text-3xl font-display tabular-nums" style={{ color }}>
                {data.score}
              </p>
              <p className="text-ui-xs text-muted-foreground">{data.grade}</p>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-2.5">
          {Object.entries(data.factors).map(([key, value]) => {
            const info = HEALTH_FACTOR_LABELS[key]
            if (!info) return null
            const pct = Math.round((value / info.max) * 100)
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-ui-sm text-muted-foreground">{info.label}</span>
                  <span className="text-ui-sm text-foreground/60 tabular-nums">{value}/{info.max}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {data.tips.length > 0 && (
        <div className="rounded-lg bg-primary/5 p-3">
          <p className="text-xs font-medium text-primary mb-1.5 flex items-center gap-1">
            <Lightbulb className="h-3 w-3" /> 개선 팁
          </p>
          <ul className="space-y-1">
            {data.tips.map((tip, i) => (
              <li key={i} className="text-xs text-foreground/70 flex items-start gap-1.5">
                <span className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  )
}

// ─── Main Component ────────────────────────────────────────────────

export function InsightReport({
  data,
  reportType = "monthly",
}: {
  data: InsightReportData
  isPro?: boolean
  reportType?: "weekly" | "monthly"
}) {
  const { stats, reminders, digest } = data
  const isWeekly = reportType === "weekly"
  const periodLabel = isWeekly ? "이번 주" : "이번 달"
  const digestTitle = isWeekly ? "주간 다이제스트" : "월간 다이제스트"

  return (
    <div className="space-y-6">
      {/* 1. Stats */}
      <StatsSection stats={stats} periodLabel={periodLabel} />

      {/* 2. Hourly Heatmap */}
      {data.hourly_heatmap && (
        <HourlyHeatmapSection data={data.hourly_heatmap} />
      )}

      {/* 3. Streak */}
      {data.streak && (
        <StreakSection data={data.streak} />
      )}

      {/* 4. Productivity Score */}
      {data.productivity_score && (
        <ProductivityScoreSection data={data.productivity_score} />
      )}

      {/* 5. Utilization */}
      {(data as unknown as WeeklyInsightData).utilization && (
        <UtilizationSection data={(data as unknown as WeeklyInsightData).utilization!} />
      )}

      {/* 6. Knowledge Health */}
      {(data as unknown as WeeklyInsightData).knowledge_health && (
        <KnowledgeHealthSection data={(data as unknown as WeeklyInsightData).knowledge_health!} />
      )}

      {/* 7. MoM Comparison (monthly only) */}
      {!isWeekly && data.mom_comparison && (
        <MoMComparisonSection data={data.mom_comparison} />
      )}

      {/* 6. Interests (monthly only) */}
      {!isWeekly && (
        <InterestsSection interests={data.interests} />
      )}

      {/* 7. Weekly Breakdown (monthly only) */}
      {!isWeekly && data.weekly_breakdown && data.weekly_breakdown.length > 0 && (
        <WeeklyBreakdownSection data={data.weekly_breakdown} />
      )}

      {/* 8. Reminders */}
      <RemindersSection reminders={reminders} />

      {/* 9. Digest */}
      {(digest?.one_liner || digest?.full_summary || (digest?.key_insights && digest.key_insights.length > 0)) && (
        <DigestSection digest={digest} title={digestTitle} />
      )}
    </div>
  )
}
