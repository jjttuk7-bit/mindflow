import { describe, it, expect, vi, beforeEach } from "vitest"
import { rateLimit } from "@/lib/rate-limit"

function mockRequest(path: string, ip = "127.0.0.1") {
  return {
    headers: {
      get: (name: string) => (name === "x-forwarded-for" ? ip : null),
    },
    nextUrl: { pathname: path },
  } as unknown as import("next/server").NextRequest
}

describe("rateLimit", () => {
  it("allows requests under the limit", () => {
    const req = mockRequest("/api/test", "10.0.0.1")
    const result = rateLimit(req, { maxRequests: 5, windowMs: 60_000 })
    expect(result).toBeNull()
  })

  it("blocks requests over the limit", () => {
    const ip = "10.0.0.2"
    for (let i = 0; i < 3; i++) {
      rateLimit(mockRequest("/api/test2", ip), { maxRequests: 3, windowMs: 60_000 })
    }
    const result = rateLimit(mockRequest("/api/test2", ip), { maxRequests: 3, windowMs: 60_000 })
    expect(result).not.toBeNull()
  })

  it("separates limits by path", () => {
    const ip = "10.0.0.3"
    for (let i = 0; i < 3; i++) {
      rateLimit(mockRequest("/api/path-a", ip), { maxRequests: 3, windowMs: 60_000 })
    }
    // Different path should not be blocked
    const result = rateLimit(mockRequest("/api/path-b", ip), { maxRequests: 3, windowMs: 60_000 })
    expect(result).toBeNull()
  })

  it("separates limits by IP", () => {
    for (let i = 0; i < 3; i++) {
      rateLimit(mockRequest("/api/path-c", "10.0.0.4"), { maxRequests: 3, windowMs: 60_000 })
    }
    // Different IP should not be blocked
    const result = rateLimit(mockRequest("/api/path-c", "10.0.0.5"), { maxRequests: 3, windowMs: 60_000 })
    expect(result).toBeNull()
  })
})
