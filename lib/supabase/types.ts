export type ContentType = "text" | "link" | "image" | "voice" | "file"

export interface Item {
  id: string
  type: ContentType
  content: string
  summary?: string | null
  is_pinned?: boolean
  is_archived?: boolean
  deleted_at?: string | null
  user_id?: string
  metadata: LinkMeta | ImageMeta | VoiceMeta | FileMeta | Record<string, never>
  created_at: string
  updated_at: string
  tags?: Tag[]
  project_id?: string | null
  context?: ItemContext | null
  source?: ItemSource
  _offline?: boolean
}

export interface Tag {
  id: string
  name: string
  created_at: string
}

export interface ItemTag {
  item_id: string
  tag_id: string
}

export interface LinkMeta {
  og_title?: string
  og_description?: string
  og_image?: string
  og_url?: string
  og_domain?: string
  page_snapshot?: string
}

export interface ScreenshotData {
  type: string
  urls: string[]
  dates: string[]
  todos: string[]
  people: string[]
  key_info: string[]
  expiry?: {
    detected: boolean
    expiry_date: string
    expiry_type: string
    vendor: string
    amount: string
    barcode: string
  }
}

export interface ExpiryMeta {
  expiry_date: string        // "2026-06-30" ISO date
  expiry_type: "coupon" | "gift_card" | "ticket" | "membership" | "warranty" | "other"
  vendor?: string            // "스타벅스", "배민" 등
  amount?: string            // "5,000원"
  barcode?: string           // 바코드/PIN (텍스트 추출)
}

export interface ImageMeta {
  image_url: string
  screenshot?: ScreenshotData
  expiry?: ExpiryMeta
}

export interface VoiceMeta {
  file_url: string
  duration: number
  transcript?: string
}

export interface FileMeta {
  file_url: string
  file_name: string
  file_size: number
  file_type: string
  extracted_text?: string
  ai_summary?: string
}

export interface ItemContext {
  source: string
  time_of_day: string
  day_of_week: string
  topic_cluster?: string
  ai_comment?: string
  link_analysis?: string
}

export type ItemSource = "web" | "telegram" | "api"

export interface Project {
  id: string
  user_id: string
  name: string
  description?: string | null
  color: string
  is_auto: boolean
  created_at: string
  updated_at: string
}

export interface Todo {
  id: string
  user_id: string
  item_id?: string | null
  project_id?: string | null
  content: string
  is_completed: boolean
  due_date?: string | null
  created_at: string
  updated_at: string
}

export interface ChatSession {
  id: string
  user_id: string
  title: string
  created_at: string
}

export interface ChatMessage {
  id: string
  session_id: string
  role: "user" | "assistant"
  content: string
  sources?: string[] | null
  created_at: string
}

export interface InsightReport {
  id: string
  user_id: string
  month: string
  report_type: "weekly" | "monthly"
  report_data: InsightReportData
  created_at: string
}

export interface HourlyHeatmapData {
  hourly_counts: Record<string, number>
  peak_hour: number
  peak_count: number
}

export interface MoMComparisonData {
  previous_total: number
  current_total: number
  change_percent: number
  new_topics: string[]
  dropped_topics: string[]
}

export interface StreakSnapshotData {
  current_streak: number
  longest_streak: number
  total_active_days: number
  active_rate_percent: number
}

export interface ProductivityScoreData {
  score: number
  label: string
  factors: string[]
}

export interface WeeklyBreakdownData {
  week_start: string
  week_end: string
  total_captures: number
  by_type: Record<string, number>
  top_projects: string[]
}

export interface WeeklyInsightData {
  stats: {
    total_captures: number
    by_type: Record<string, number>
    by_source: Record<string, number>
    daily_heatmap: Record<string, number>
    top_projects: string[]
    todos: { completed: number; pending: number }
  }
  hourly_heatmap: HourlyHeatmapData
  streak: StreakSnapshotData
  productivity_score?: ProductivityScoreData
  reminders: {
    unread_links: number
    overdue_todos: number
    stale_pins: number
    items: Array<{ id: string; title: string; age_days: number }>
  }
  digest?: {
    one_liner: string
    key_insights: string[]
    full_summary: string
  }
  utilization?: {
    total_items: number
    archived: number
    connected: number
    todos_completed: number
    rate: number
  }
  knowledge_health?: {
    score: number
    grade: string
    factors: {
      capture_consistency: number
      organization: number
      utilization: number
      diversity: number
      connectivity: number
    }
    tips: string[]
  }
  connection_summary?: {
    new_connections: number
    top_pairs: { source: string; target: string; reason?: string }[]
  }
  interest_shift?: {
    current_tags: { name: string; count: number }[]
    previous_tags: { name: string; count: number }[]
    new_interests: string[]
    fading_interests: string[]
  }
}

export interface InsightReportData {
  stats: {
    total_captures: number
    by_type: Record<string, number>
    by_source: Record<string, number>
    daily_heatmap: Record<string, number>
    top_projects: string[]
    todos: { completed: number; pending: number }
  }
  interests: {
    top_topics: string[]
    trending_up: string[]
    trending_down: string[]
    summary: string
  }
  reminders: {
    unread_links: number
    overdue_todos: number
    stale_pins: number
    items: Array<{ id: string; title: string; age_days: number }>
  }
  digest: {
    one_liner: string
    key_insights: string[]
    full_summary: string
  }
  hourly_heatmap?: HourlyHeatmapData
  mom_comparison?: MoMComparisonData
  streak?: StreakSnapshotData
  productivity_score?: ProductivityScoreData
  weekly_breakdown?: WeeklyBreakdownData[]
}

export interface AIProfileData {
  // existing fields
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

  // new fields
  dimensions: {
    explorer: number
    executor: number
    creator: number
    analyst: number
    connector: number
  }
  time_persona: {
    label: string
    emoji: string
    description: string
  }
  diversity_score: {
    score: number
    label: string
    unique_tags: number
    unique_types: number
  }
  history?: AIProfileSnapshot[]
}

export interface AIProfileSnapshot {
  date: string
  dimensions: AIProfileData["dimensions"]
  top_topics: string[]
  total_items: number
  diversity_score: number
}

export interface UserSettings {
  id: string
  user_id: string
  plan: "free" | "pro"
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  telegram_chat_id?: string | null
  telegram_linked_at?: string | null
  preferences: Record<string, unknown>
  ai_profile?: AIProfileData | null
  created_at: string
  updated_at: string
}

export interface ItemConnection {
  id: string
  source_id: string
  target_id: string
  similarity: number
  ai_reason?: string | null
  created_at: string
}

export interface UserStreak {
  id: string
  user_id: string
  current_streak: number
  longest_streak: number
  last_active_date: string | null
  created_at: string
  updated_at: string
}

export type NudgeType = "connection" | "resurface" | "trend" | "action" | "expiry" | "zombie"

export interface Nudge {
  id: string
  user_id: string
  type: NudgeType
  title: string
  content: string
  related_item_ids: string[]
  is_read: boolean
  created_at: string
}
