import { z } from "zod"

// ── Customer Schemas ──

export const customerCreateSchema = z.object({
  name: z.string().min(1).max(100),
  company: z.string().max(200).optional(),
  role: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().max(200).optional().or(z.literal("")),
  grade: z.enum(["S", "A", "B", "C", "D"]).optional().default("C"),
  source: z.enum(["referral", "cold", "inbound", "event", "other"]).optional().default("other"),
  notes: z.string().max(5000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
})

export const customerUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  company: z.string().max(200).nullable().optional(),
  role: z.string().max(100).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email().max(200).nullable().optional().or(z.literal("")),
  avatar_url: z.string().url().nullable().optional(),
  grade: z.enum(["S", "A", "B", "C", "D"]).optional(),
  source: z.enum(["referral", "cold", "inbound", "event", "other"]).optional(),
  notes: z.string().max(5000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

// ── Deal Schemas ──

export const dealCreateSchema = z.object({
  customer_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  amount: z.number().int().min(0).optional().default(0),
  currency: z.string().max(10).optional().default("KRW"),
  stage: z.enum(["lead", "contact", "proposal", "negotiation", "closed_won", "closed_lost"]).optional().default("lead"),
  probability: z.number().int().min(0).max(100).optional().default(0),
  expected_close_date: z.string().optional(),
  notes: z.string().max(5000).optional(),
})

export const dealUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  amount: z.number().int().min(0).optional(),
  stage: z.enum(["lead", "contact", "proposal", "negotiation", "closed_won", "closed_lost"]).optional(),
  probability: z.number().int().min(0).max(100).optional(),
  expected_close_date: z.string().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  closed_at: z.string().datetime().nullable().optional(),
}).strict()

// ── Activity Schemas ──

export const activityCreateSchema = z.object({
  customer_id: z.string().uuid().optional(),
  deal_id: z.string().uuid().optional(),
  type: z.enum(["call", "meeting", "email", "note", "visit", "message", "voice"]),
  content: z.string().min(1).max(10000),
  summary: z.string().max(500).optional(),
  duration_min: z.number().int().min(0).optional(),
  occurred_at: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

// ── Follow-up Schemas ──

export const followUpCreateSchema = z.object({
  customer_id: z.string().uuid(),
  deal_id: z.string().uuid().optional(),
  activity_id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  due_date: z.string().datetime(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
})

export const followUpUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  due_date: z.string().datetime().optional(),
  status: z.enum(["pending", "completed", "skipped", "overdue"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  completed_at: z.string().datetime().nullable().optional(),
}).strict()
