import { describe, it, expect } from "vitest"
import {
  itemCreateSchema,
  itemUpdateSchema,
  todoCreateSchema,
  chatSchema,
  searchSchema,
  shareSchema,
  projectCreateSchema,
  exportSummarySchema,
  aiTagSchema,
  validate,
} from "@/lib/validations"

describe("itemCreateSchema", () => {
  it("accepts valid input", () => {
    const result = itemCreateSchema.safeParse({
      type: "text",
      content: "Hello world",
    })
    expect(result.success).toBe(true)
  })

  it("rejects empty content", () => {
    const result = itemCreateSchema.safeParse({
      type: "text",
      content: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid type", () => {
    const result = itemCreateSchema.safeParse({
      type: "video",
      content: "test",
    })
    expect(result.success).toBe(false)
  })

  it("defaults metadata to empty object", () => {
    const result = itemCreateSchema.safeParse({
      type: "link",
      content: "https://example.com",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.metadata).toEqual({})
    }
  })
})

describe("itemUpdateSchema", () => {
  it("accepts partial updates", () => {
    const result = itemUpdateSchema.safeParse({ is_pinned: true })
    expect(result.success).toBe(true)
  })

  it("rejects unknown fields (strict)", () => {
    const result = itemUpdateSchema.safeParse({
      is_pinned: true,
      hacked: "injection",
    })
    expect(result.success).toBe(false)
  })

  it("accepts null project_id", () => {
    const result = itemUpdateSchema.safeParse({ project_id: null })
    expect(result.success).toBe(true)
  })
})

describe("todoCreateSchema", () => {
  it("accepts valid todo", () => {
    const result = todoCreateSchema.safeParse({ content: "Buy milk" })
    expect(result.success).toBe(true)
  })

  it("rejects content over 2000 chars", () => {
    const result = todoCreateSchema.safeParse({ content: "a".repeat(2001) })
    expect(result.success).toBe(false)
  })
})

describe("chatSchema", () => {
  it("accepts valid message", () => {
    const result = chatSchema.safeParse({ message: "Hello AI" })
    expect(result.success).toBe(true)
  })

  it("rejects empty message", () => {
    const result = chatSchema.safeParse({ message: "" })
    expect(result.success).toBe(false)
  })

  it("accepts optional session_id", () => {
    const result = chatSchema.safeParse({
      message: "test",
      session_id: "550e8400-e29b-41d4-a716-446655440000",
    })
    expect(result.success).toBe(true)
  })
})

describe("searchSchema", () => {
  it("defaults limit to 10", () => {
    const result = searchSchema.safeParse({ query: "test" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(10)
    }
  })

  it("rejects limit over 50", () => {
    const result = searchSchema.safeParse({ query: "test", limit: 100 })
    expect(result.success).toBe(false)
  })
})

describe("shareSchema", () => {
  it("accepts valid UUID", () => {
    const result = shareSchema.safeParse({
      itemId: "550e8400-e29b-41d4-a716-446655440000",
    })
    expect(result.success).toBe(true)
  })

  it("rejects non-UUID", () => {
    const result = shareSchema.safeParse({ itemId: "not-a-uuid" })
    expect(result.success).toBe(false)
  })
})

describe("projectCreateSchema", () => {
  it("defaults color to #8B7355", () => {
    const result = projectCreateSchema.safeParse({ name: "My Project" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.color).toBe("#8B7355")
    }
  })

  it("rejects invalid hex color", () => {
    const result = projectCreateSchema.safeParse({
      name: "Test",
      color: "red",
    })
    expect(result.success).toBe(false)
  })
})

describe("exportSummarySchema", () => {
  it("defaults depth to brief", () => {
    const result = exportSummarySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.depth).toBe("brief")
    }
  })

  it("accepts detailed depth", () => {
    const result = exportSummarySchema.safeParse({ depth: "detailed" })
    expect(result.success).toBe(true)
  })
})

describe("aiTagSchema", () => {
  it("accepts valid input", () => {
    const result = aiTagSchema.safeParse({
      item_id: "550e8400-e29b-41d4-a716-446655440000",
      content: "Some content to tag",
      type: "text",
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing fields", () => {
    const result = aiTagSchema.safeParse({ content: "test" })
    expect(result.success).toBe(false)
  })
})

describe("validate helper", () => {
  it("returns success with parsed data", () => {
    const result = validate(chatSchema, { message: "Hello" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.message).toBe("Hello")
    }
  })

  it("returns error response on invalid input", () => {
    const result = validate(chatSchema, { message: "" })
    expect(result.success).toBe(false)
  })
})
