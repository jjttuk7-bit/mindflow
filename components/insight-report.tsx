"use client"

import { InsightReportData } from "@/lib/supabase/types"
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
  Lock,
  CheckCircle2,
  Circle,
  Sparkles,
  Lightbulb,
  BarChart3,
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

function ProGate({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px] z-10 rounded-xl flex flex-col items-center justify-center gap-2">
        <Lock className="h-5 w-5 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground/70 font-medium">Pro feature</p>
        <a
          href="/settings"
          className="text-xs text-primary hover:underline"
        >
          Upgrade to unlock
        </a>
      </div>
      <div className="opacity-30 pointer-events-none">{children}</div>
    </div>
  )
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

export function InsightReport({
  data,
  isPro,
}: {
  data: InsightReportData
  isPro: boolean
}) {
  const { stats, interests, reminders, digest } = data

  // Prepare chart data
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

  // Prepare heatmap
  const heatmapEntries = Object.entries(stats.daily_heatmap)
  const maxHeatmapValue = Math.max(...heatmapEntries.map(([, v]) => v), 1)

  // Build a calendar grid for the month
  const sortedDays = heatmapEntries.map(([d]) => d).sort()
  const firstDay = sortedDays.length > 0 ? new Date(sortedDays[0]) : new Date()
  const startOfMonth = new Date(firstDay.getFullYear(), firstDay.getMonth(), 1)
  const daysInMonth = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate()
  const startDow = startOfMonth.getDay() // 0=Sun

  const calendarCells: Array<{ date: string; count: number } | null> = []
  // Fill leading empty cells
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
    <div className="space-y-6">
      {/* Stats Section */}
      <SectionCard title="Activity" icon={<BarChart3 className="h-4 w-4 text-primary" />}>
        {/* Total captures hero */}
        <div className="text-center mb-6">
          <p className="text-5xl font-display text-primary tabular-nums">
            {stats.total_captures}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Total captures this month</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* By Type */}
          {typeData.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3">By Type</p>
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

          {/* By Source */}
          {sourceData.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3">By Source</p>
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

        {/* Daily Heatmap */}
        {calendarCells.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-medium text-muted-foreground mb-3">Daily Activity</p>
            <div className="grid grid-cols-7 gap-1">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i} className="text-[10px] text-muted-foreground/50 text-center font-medium">
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

        {/* Top Projects */}
        {stats.top_projects.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-medium text-muted-foreground mb-2">Top Projects</p>
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

        {/* TODO Stats */}
        {todoTotal > 0 && (
          <div className="mt-6">
            <p className="text-xs font-medium text-muted-foreground mb-2">TODO Progress</p>
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
                {stats.todos.completed} completed
              </span>
              <span className="flex items-center gap-1">
                <Circle className="h-3 w-3" />
                {stats.todos.pending} pending
              </span>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Interests Section (Pro only) */}
      {isPro ? (
        <SectionCard title="Interests" icon={<Lightbulb className="h-4 w-4 text-amber-accent" />}>
          {interests.top_topics.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Top Topics</p>
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
                  Trending Up
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
                  Trending Down
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
      ) : (
        <ProGate>
          <SectionCard title="Interests" icon={<Lightbulb className="h-4 w-4 text-amber-accent" />}>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-muted">Topic 1</span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-muted">Topic 2</span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-muted">Topic 3</span>
              </div>
              <p className="text-sm text-muted-foreground">AI-powered topic analysis and trends...</p>
            </div>
          </SectionCard>
        </ProGate>
      )}

      {/* Reminders Section */}
      <SectionCard title="Reminders" icon={<Pin className="h-4 w-4 text-dusty-rose" />}>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-muted/40 p-3 text-center">
            <Link className="h-4 w-4 mx-auto text-sage mb-1" />
            <p className="text-2xl font-display text-foreground tabular-nums">
              {reminders.unread_links}
            </p>
            <p className="text-[11px] text-muted-foreground">Unread Links</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3 text-center">
            <ListTodo className="h-4 w-4 mx-auto text-terracotta mb-1" />
            <p className="text-2xl font-display text-foreground tabular-nums">
              {reminders.overdue_todos}
            </p>
            <p className="text-[11px] text-muted-foreground">Overdue TODOs</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3 text-center">
            <Pin className="h-4 w-4 mx-auto text-amber-accent mb-1" />
            <p className="text-2xl font-display text-foreground tabular-nums">
              {reminders.stale_pins}
            </p>
            <p className="text-[11px] text-muted-foreground">Stale Pins</p>
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

      {/* Digest Section (Pro only) */}
      {isPro ? (
        <SectionCard title="Monthly Digest" icon={<Sparkles className="h-4 w-4 text-primary" />}>
          {digest.one_liner && (
            <p className="text-lg font-display text-foreground mb-4 leading-snug">
              &ldquo;{digest.one_liner}&rdquo;
            </p>
          )}

          {digest.key_insights.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Key Insights</p>
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
      ) : (
        <ProGate>
          <SectionCard title="Monthly Digest" icon={<Sparkles className="h-4 w-4 text-primary" />}>
            <div className="space-y-3">
              <p className="text-lg font-display text-muted-foreground">
                &ldquo;Your monthly highlight goes here&rdquo;
              </p>
              <ul className="space-y-2">
                <li className="text-sm text-muted-foreground">Key insight placeholder...</li>
                <li className="text-sm text-muted-foreground">Another insight placeholder...</li>
              </ul>
            </div>
          </SectionCard>
        </ProGate>
      )}
    </div>
  )
}
