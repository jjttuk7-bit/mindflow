import { get, set, del } from "idb-keyval"
import type { Item, ContentType } from "@/lib/supabase/types"

// --- Feed cache ---

const CACHED_ITEMS_KEY = "cached-items"

export async function getCachedItems(): Promise<Item[]> {
  return (await get<Item[]>(CACHED_ITEMS_KEY)) ?? []
}

export async function setCachedItems(items: Item[]): Promise<void> {
  await set(CACHED_ITEMS_KEY, items)
}

// --- Offline write queue ---

const OFFLINE_QUEUE_KEY = "offline-queue"

export interface OfflineItem {
  id: string
  type: ContentType
  content: string
  metadata: Record<string, never>
  created_at: string
  updated_at: string
  _offline: true
}

export async function getOfflineQueue(): Promise<OfflineItem[]> {
  return (await get<OfflineItem[]>(OFFLINE_QUEUE_KEY)) ?? []
}

export async function addToOfflineQueue(item: OfflineItem): Promise<void> {
  const queue = await getOfflineQueue()
  queue.push(item)
  await set(OFFLINE_QUEUE_KEY, queue)
}

export async function removeFromOfflineQueue(id: string): Promise<void> {
  const queue = await getOfflineQueue()
  await set(
    OFFLINE_QUEUE_KEY,
    queue.filter((i) => i.id !== id),
  )
}

export async function clearOfflineQueue(): Promise<void> {
  await del(OFFLINE_QUEUE_KEY)
}

// --- Helper to create and queue an offline item ---

export function createOfflineItem(
  type: ContentType,
  content: string,
): OfflineItem {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    type,
    content,
    metadata: {} as Record<string, never>,
    created_at: now,
    updated_at: now,
    _offline: true,
  }
}
