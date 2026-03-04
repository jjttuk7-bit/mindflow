import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock OpenAI before importing ai module
const mockCreate = vi.fn()
const mockEmbeddingsCreate = vi.fn()

vi.mock("openai", () => {
  class MockOpenAI {
    chat = { completions: { create: mockCreate } }
    embeddings = { create: mockEmbeddingsCreate }
  }
  return { default: MockOpenAI, toFile: vi.fn() }
})

import {
  generateTags,
  generateSummary,
  generateInsight,
  generateLinkAnalysis,
} from "@/lib/ai"

function mockChatResponse(content: string) {
  mockCreate.mockResolvedValueOnce({
    choices: [{ message: { content } }],
  })
}

describe("generateTags", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns empty array for placeholder content", async () => {
    expect(await generateTags("Image", "image", [])).toEqual([])
    expect(await generateTags("Voice memo", "voice", [])).toEqual([])
    expect(await generateTags("Screenshot", "image", [])).toEqual([])
    expect(await generateTags("이미지", "image", [])).toEqual([])
    expect(await generateTags("", "text", [])).toEqual([])
    expect(await generateTags("a", "text", [])).toEqual([])
  })

  it("parses JSON object with tags key", async () => {
    mockChatResponse('{"tags": ["개발", "react", "성능최적화"]}')
    const tags = await generateTags("React 성능 최적화 방법", "text", [])
    expect(tags).toEqual(["개발", "react", "성능최적화"])
  })

  it("parses plain JSON array", async () => {
    mockChatResponse('["개발", "typescript", "공식문서"]')
    const tags = await generateTags("TypeScript 5.0 새 기능", "text", [])
    expect(tags).toEqual(["개발", "typescript", "공식문서"])
  })

  it("normalizes tags: strips markers, quotes, special chars", async () => {
    mockChatResponse('{"tags": ["#React", "- web dev", "\'리팩토링\'", "성능  최적화"]}')
    const tags = await generateTags("React 리팩토링", "text", [])
    expect(tags).toEqual(["react", "web-dev", "리팩토링", "성능-최적화"])
  })

  it("filters banned tags", async () => {
    mockChatResponse('{"tags": ["개발", "general", "메모", "react", "기타"]}')
    const tags = await generateTags("React 코드", "text", [])
    expect(tags).toEqual(["개발", "react"])
  })

  it("limits to 5 tags", async () => {
    mockChatResponse('{"tags": ["a", "b", "c", "d", "e", "f", "g"]}')
    const tags = await generateTags("lots of content", "text", [])
    expect(tags).toHaveLength(5)
  })

  it("filters tags longer than 20 chars", async () => {
    mockChatResponse('{"tags": ["ok", "this-tag-is-way-too-long-to-be-useful"]}')
    const tags = await generateTags("some content", "text", [])
    expect(tags).toEqual(["ok"])
  })

  it("extracts array from markdown code block", async () => {
    mockChatResponse('Here are the tags:\n["개발", "python"]')
    const tags = await generateTags("Python 코드 작성법", "text", [])
    expect(tags).toEqual(["개발", "python"])
  })
})

describe("generateSummary", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns null for short content", async () => {
    const result = await generateSummary("짧은 메모")
    expect(result).toBeNull()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it("parses JSON response with summary key", async () => {
    mockChatResponse('{"summary": "React 성능 최적화를 위한 핵심 전략"}')
    const result = await generateSummary("A".repeat(60), "text")
    expect(result).toBe("React 성능 최적화를 위한 핵심 전략")
  })

  it("falls back to raw text on invalid JSON", async () => {
    mockChatResponse("React 성능 최적화를 위한 핵심 전략")
    const result = await generateSummary("A".repeat(60), "text")
    expect(result).toBe("React 성능 최적화를 위한 핵심 전략")
  })

  it("passes type parameter to prompt", async () => {
    mockChatResponse('{"summary": "링크 요약"}')
    await generateSummary("A".repeat(60), "link")
    const prompt = mockCreate.mock.calls[0][0].messages[0].content
    expect(prompt).toContain("이 링크가 무엇을 다루는 글인지")
  })
})

describe("generateInsight", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns null for short/empty content", async () => {
    expect(await generateInsight("", "text")).toBeNull()
    expect(await generateInsight("short", "text")).toBeNull()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it("includes time context in prompt when provided", async () => {
    mockChatResponse("늦은 시간까지 기록하시네요!")
    await generateInsight("A".repeat(20), "text", { timeOfDay: "night" })
    const prompt = mockCreate.mock.calls[0][0].messages[0].content
    expect(prompt).toContain("심야 시간")
  })

  it("includes recent topics in prompt when provided", async () => {
    mockChatResponse("이 주제에 관심이 많으시네요!")
    await generateInsight("A".repeat(20), "text", { recentTopics: ["react", "개발"] })
    const prompt = mockCreate.mock.calls[0][0].messages[0].content
    expect(prompt).toContain("react")
    expect(prompt).toContain("연속 저장")
  })
})

describe("generateLinkAnalysis", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns null for insufficient context", async () => {
    expect(await generateLinkAnalysis("", undefined, undefined)).toBeNull()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it("parses JSON response with analysis key", async () => {
    mockChatResponse('{"analysis": "GitHub 오픈소스 프로젝트에요."}')
    const result = await generateLinkAnalysis("https://github.com/foo/bar", "Foo Bar", "A cool project")
    expect(result).toBe("GitHub 오픈소스 프로젝트에요.")
  })

  it("adds GitHub domain hint", async () => {
    mockChatResponse('{"analysis": "test"}')
    await generateLinkAnalysis("https://github.com/foo/bar", "Title")
    const prompt = mockCreate.mock.calls[0][0].messages[0].content
    expect(prompt).toContain("GitHub 링크입니다")
  })

  it("adds YouTube domain hint", async () => {
    mockChatResponse('{"analysis": "test"}')
    await generateLinkAnalysis("https://youtube.com/watch?v=abc", "Video")
    const prompt = mockCreate.mock.calls[0][0].messages[0].content
    expect(prompt).toContain("YouTube 영상입니다")
  })

  it("falls back to raw text on invalid JSON", async () => {
    mockChatResponse("GitHub 레포 분석 내용")
    const result = await generateLinkAnalysis("https://github.com/foo/bar", "Title")
    expect(result).toBe("GitHub 레포 분석 내용")
  })
})
