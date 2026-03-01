import { GoogleGenerativeAI } from "@google/generative-ai"

let _genAI: GoogleGenerativeAI | null = null
function getGenAI() {
  if (!_genAI) {
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  }
  return _genAI
}

export async function generateTags(
  content: string,
  type: string,
  existingTags: string[]
): Promise<string[]> {
  const model = getGenAI().getGenerativeModel({ model: "gemini-2.0-flash" })

  const prompt = `You are a tagging assistant. Given content, return 1-3 relevant tags as a JSON array of strings.
Prefer reusing existing tags when appropriate: [${existingTags.join(", ")}].
Only create new tags when none of the existing tags fit.
Tags should be lowercase, single-word or hyphenated (e.g., "web-dev", "design", "meeting").
Content type: ${type}.
Return ONLY a JSON array, nothing else.

Content: ${content}`

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()
  try {
    return JSON.parse(text)
  } catch {
    // Try extracting JSON array from response
    const match = text.match(/\[[\s\S]*\]/)
    if (match) {
      try { return JSON.parse(match[0]) } catch { /* ignore */ }
    }
    return []
  }
}

export async function generateSummary(content: string): Promise<string | null> {
  if (content.length < 100) return null

  const model = getGenAI().getGenerativeModel({ model: "gemini-2.0-flash" })

  const result = await model.generateContent(
    "Summarize the following in one concise sentence. Return ONLY the summary sentence, nothing else.\n\n" + content
  )

  return result.response.text().trim() || null
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const model = getGenAI().getGenerativeModel({ model: "gemini-embedding-001" })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await model.embedContent({
    content: { parts: [{ text }] },
    outputDimensionality: 768,
  } as any)
  return result.embedding.values
}

export async function classifyProject(
  content: string,
  type: string,
  existingProjects: { id: string; name: string }[]
): Promise<{ action: "none" } | { action: "new"; name: string } | { action: "existing"; project_id: string }> {
  const model = getGenAI().getGenerativeModel({ model: "gemini-2.0-flash" })

  let prompt: string
  if (existingProjects.length === 0) {
    prompt = `You are a project classifier. Given content, decide if it warrants creating a new project.
A project groups related items by topic/theme (e.g., "Web Development", "Travel Plans", "Work").
Content type: ${type}.
Return ONLY valid JSON: {"action":"new","name":"Project Name"} or {"action":"none"}.

Content: ${content}`
  } else {
    const projectList = existingProjects.map((p) => `- ${p.id}: ${p.name}`).join("\n")
    prompt = `You are a project classifier. Given content, assign it to an existing project or suggest a new one.
Existing projects:
${projectList}

Content type: ${type}.
Return ONLY valid JSON:
- {"action":"existing","project_id":"<id>"} if it fits an existing project
- {"action":"new","name":"Project Name"} if it needs a new project
- {"action":"none"} if it doesn't fit any project

Content: ${content}`
  }

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      try { return JSON.parse(match[0]) } catch { /* ignore */ }
    }
    return { action: "none" }
  }
}

export async function extractTodos(content: string): Promise<string[]> {
  const model = getGenAI().getGenerativeModel({ model: "gemini-2.0-flash" })

  const prompt = `You are a TODO extractor. Given content, extract actionable TODO items.
Return ONLY a JSON array of strings. If there are no actionable items, return [].

Content: ${content}`

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\[[\s\S]*\]/)
    if (match) {
      try { return JSON.parse(match[0]) } catch { /* ignore */ }
    }
    return []
  }
}

export async function describeImage(base64: string, mimeType: string): Promise<string> {
  const model = getGenAI().getGenerativeModel({ model: "gemini-2.5-pro" })

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: base64,
      },
    },
    `이 이미지를 분석하고 간결한 설명(1-2문장, 40단어 이내)을 작성하세요.

규칙:
- 이미지에 텍스트가 있으면 한글, 숫자, 영문 모두 정확히 그대로 옮겨 적으세요. 한글 자모 하나하나 정확히 읽어주세요.
- 스크린샷이나 문서는 텍스트 내용에 집중하세요.
- 사진은 주요 피사체와 장면을 설명하세요.
- 한국어로 응답하세요.
- 설명만 반환하고, 레이블이나 접두사는 붙이지 마세요.`,
  ])

  return result.response.text().trim()
}

export async function transcribeAudio(file: File): Promise<string> {
  const model = getGenAI().getGenerativeModel({ model: "gemini-2.0-flash" })

  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString("base64")

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: file.type || "audio/webm",
        data: base64,
      },
    },
    "Transcribe this audio accurately. Return ONLY the transcription text, nothing else. If the audio is in Korean, transcribe in Korean.",
  ])

  return result.response.text().trim()
}
