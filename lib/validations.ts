import { z } from "zod"
import { NextResponse } from "next/server"

// ── Shared Schemas ──

export const itemCreateSchema = z.object({
  type: z.enum(["text", "link", "image", "voice"]),
  content: z.string().min(1).max(50000),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
})

export const itemUpdateSchema = z.object({
  content: z.string().min(1).max(50000).optional(),
  summary: z.string().max(500).optional(),
  is_pinned: z.boolean().optional(),
  is_archived: z.boolean().optional(),
  project_id: z.string().uuid().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const todoCreateSchema = z.object({
  content: z.string().min(1).max(2000),
  project_id: z.string().uuid().nullable().optional(),
  item_id: z.string().uuid().nullable().optional(),
  due_date: z.string().datetime().nullable().optional(),
})

export const todoUpdateSchema = z.object({
  is_completed: z.boolean().optional(),
  content: z.string().min(1).max(2000).optional(),
  project_id: z.string().uuid().nullable().optional(),
  due_date: z.string().datetime().nullable().optional(),
}).strict()

export const projectCreateSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default("#8B7355"),
  description: z.string().max(500).optional(),
})

export const projectUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  description: z.string().max(500).nullable().optional(),
}).strict()

export const settingsUpdateSchema = z.object({
  preferences: z.record(z.string(), z.unknown()).optional(),
  telegram_chat_id: z.string().nullable().optional(),
  telegram_linked_at: z.string().datetime().nullable().optional(),
}).strict()

export const tagUpdateSchema = z.object({
  name: z.string().min(1).max(100),
})

export const chatSchema = z.object({
  message: z.string().min(1).max(10000),
  session_id: z.string().uuid().optional(),
})

export const searchSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(50).optional().default(10),
})

export const shareSchema = z.object({
  itemId: z.string().uuid(),
})

export const exportSummarySchema = z.object({
  item_ids: z.array(z.string().uuid()).optional(),
  project_id: z.string().uuid().optional(),
  tag: z.string().max(100).optional(),
  depth: z.enum(["brief", "detailed"]).optional().default("brief"),
})

export const aiTagSchema = z.object({
  item_id: z.string().uuid(),
  content: z.string().min(1).max(50000),
  type: z.enum(["text", "link", "image", "voice"]),
})

// ── Validation Helper ──

export function validate<T>(schema: z.ZodSchema<T>, data: unknown):
  { success: true; data: T } | { success: false; error: NextResponse } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const messages = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ")
  return {
    success: false,
    error: NextResponse.json({ error: "Validation failed", details: messages }, { status: 400 }),
  }
}
