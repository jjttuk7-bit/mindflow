export type ContentType = "text" | "link" | "image" | "voice"

export interface Item {
  id: string
  type: ContentType
  content: string
  summary?: string | null
  is_pinned?: boolean
  is_archived?: boolean
  user_id?: string
  metadata: LinkMeta | ImageMeta | VoiceMeta | Record<string, never>
  created_at: string
  updated_at: string
  tags?: Tag[]
  project_id?: string | null
  context?: ItemContext | null
  source?: ItemSource
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
}

export interface ScreenshotData {
  type: string
  urls: string[]
  dates: string[]
  todos: string[]
  people: string[]
  key_info: string[]
}

export interface ImageMeta {
  image_url: string
  screenshot?: ScreenshotData
}

export interface VoiceMeta {
  file_url: string
  duration: number
  transcript?: string
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
  report_data: InsightReportData
  created_at: string
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
  ai_profile?: Record<string, unknown>
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

export type NudgeType = "connection" | "resurface" | "trend" | "action"

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
