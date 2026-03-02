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
  existingTags: string[],
  tagFrequencies?: string[]
): Promise<string[]> {
  // Skip tagging for placeholder content
  if (!content || content === "Image" || content === "Voice memo" || content.length < 2) {
    return []
  }

  const model = getGenAI().getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { temperature: 0.3 },
  })

  const freqSection = tagFrequencies?.length
    ? `\n[사용자의 기존 태그 - 사용 빈도순]\n${tagFrequencies.join(", ")}\n→ 기존 태그와 의미가 같으면 반드시 기존 태그를 그대로 사용. 새 태그는 기존에 해당하는 것이 정말 없을 때만.`
    : existingTags.length
    ? `\n[사용자의 기존 태그]\n${existingTags.join(", ")}\n→ 기존 태그와 의미가 같으면 반드시 재사용.`
    : ""

  const typeGuidance: Record<string, string> = {
    text: `[텍스트 메모 태깅]
- 핵심 주제 1~2개를 태그로 추출
- 행동(todo, 회의, 리뷰)이나 분야(개발, 디자인, 마케팅)를 태그로`,
    link: `[링크/URL 태깅]
- 링크의 제목과 설명에서 핵심 주제를 파악
- 서비스/플랫폼 이름보다 콘텐츠의 주제를 태그로
- 기술 문서면 해당 기술명, 뉴스면 주제, 블로그면 토픽`,
    image: `[이미지 캡션 태깅]
- 이미지에서 추출된 텍스트나 설명의 핵심 주제를 태그로
- 문서/스크린샷이면 문서의 주제를, 사진이면 피사체 카테고리를`,
    voice: `[음성 메모 태깅]
- 음성 전사(transcript)의 핵심 주제를 태그로
- 구어체 특성상 핵심만 추출. 말버릇/감탄사 무시`,
  }

  const guidance = typeGuidance[type] || typeGuidance.text

  const prompt = `콘텐츠에 1~3개 태그를 붙이세요.

${guidance}

[규칙]
1. 태그는 소문자. 영문 또는 한글. 1~2단어 (예: "react", "회의", "web-dev", "독서")
2. 기존 태그가 의미상 맞으면 무조건 재사용 (동의어 사용 금지)
3. 금지 태그: "일반", "기타", "메모", "general", "other", "misc", "note", "stuff", "image", "link", "voice", "text", "url", "사진", "음성", "링크"
4. 콘텐츠 유형 자체를 태그로 쓰지 마세요 (예: type이 "image"인데 태그도 "image" → 금지)
5. 확실한 주제만. 애매하면 1개만 반환
6. 최대 3개. 무관한 태그 절대 금지
${freqSection}

[예시]
text "React 컴포넌트 리팩토링 작업" → ["react", "리팩토링"]
text "팀 회의에서 Q3 목표 논의" → ["회의", "q3-목표"]
text "여행 가기 전 짐 싸야 할 것들" → ["여행"]
link "TypeScript 5.0 새 기능 소개 - 공식 블로그" → ["typescript"]
link "맛집 추천 - 강남역 근처 이탈리안" → ["맛집", "강남"]
image "프로젝트 일정표 - 3월 마일스톤" → ["일정", "프로젝트"]
image "산 풍경" → ["풍경"]
voice "내일 오전에 디자인 리뷰 미팅 있고, 오후에 코드 리뷰 해야 돼" → ["미팅", "코드리뷰"]

JSON 배열만 반환. 다른 텍스트 없이.

콘텐츠: ${content}`

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()

  const banned = new Set(["일반", "기타", "메모", "general", "other", "misc", "note", "stuff", "image", "link", "voice", "text", "url", "사진", "음성", "링크"])

  function parseTags(raw: string): string[] {
    try {
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed
        .map((t: unknown) => String(t).toLowerCase().trim())
        .filter((t: string) => t.length >= 1 && t.length <= 20 && !banned.has(t))
        .slice(0, 3)
    } catch { return [] }
  }

  let tags = parseTags(text)
  if (!tags.length) {
    const match = text.match(/\[[\s\S]*\]/)
    if (match) tags = parseTags(match[0])
  }
  return tags
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
  existingProjects: { id: string; name: string; samples?: string[] }[]
): Promise<{ action: "none" } | { action: "new"; name: string } | { action: "existing"; project_id: string }> {
  const model = getGenAI().getGenerativeModel({ model: "gemini-2.0-flash" })

  let prompt: string
  if (existingProjects.length === 0) {
    prompt = `당신은 프로젝트 분류 전문가입니다. 콘텐츠를 보고 새 프로젝트를 만들지 판단하세요.
프로젝트는 관련 항목을 주제/테마별로 묶는 그룹입니다 (예: "웹 개발", "여행 계획", "업무").
콘텐츠 유형: ${type}

규칙:
- 명확한 주제가 있을 때만 새 프로젝트 생성
- 일상적이거나 짧은 메모는 "none" 반환
- 프로젝트 이름은 간결하게 (2~4단어)

JSON만 반환: {"action":"new","name":"프로젝트 이름"} 또는 {"action":"none"}

콘텐츠: ${content}`
  } else {
    const projectList = existingProjects
      .map((p) => {
        const sampleText = p.samples?.length
          ? `\n  최근 항목: ${p.samples.join(" | ")}`
          : ""
        return `- ${p.id}: ${p.name}${sampleText}`
      })
      .join("\n")

    const suppressNew = existingProjects.length >= 3
      ? "\n- 기존 프로젝트가 3개 이상이므로, 기존 프로젝트에 분류하는 것을 강하게 선호하세요. 정말 맞는 프로젝트가 없을 때만 새로 만드세요."
      : ""

    prompt = `당신은 프로젝트 분류 전문가입니다. 콘텐츠를 기존 프로젝트에 분류하거나 새 프로젝트를 제안하세요.

기존 프로젝트:
${projectList}

콘텐츠 유형: ${type}

규칙:
- 기존 프로젝트의 최근 항목을 참고하여 콘텐츠가 맞는 프로젝트에 분류
- 일상적이거나 짧은 메모는 "none" 반환${suppressNew}

JSON만 반환:
- {"action":"existing","project_id":"<id>"} 기존 프로젝트에 맞을 때
- {"action":"new","name":"프로젝트 이름"} 새 프로젝트가 필요할 때
- {"action":"none"} 어디에도 맞지 않을 때

콘텐츠: ${content}`
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
    `이 이미지가 무엇인지 한 줄로 간결하게 설명하세요.

규칙:
- 핵심만 짧게 (예: "카페 메뉴판", "코드 에러 로그", "제주도 해변 사진", "회의 노트")
- 이미지에 텍스트가 많더라도 내용을 옮기지 말고, 어떤 종류의 이미지인지만 설명
- "이 이미지는~", "스크린샷입니다" 같은 설명 문구를 붙이지 마세요
- 1~2문장 이내, 최대 50자
- 한국어로 응답하세요`,
  ])

  return result.response.text().trim()
}

export interface ScreenshotAnalysis {
  is_screenshot: boolean
  type: string
  content: string
  summary: string
  extracted: {
    urls: string[]
    dates: string[]
    todos: string[]
    people: string[]
    key_info: string[]
  }
}

export async function analyzeScreenshot(base64: string, mimeType: string): Promise<ScreenshotAnalysis> {
  const model = getGenAI().getGenerativeModel({ model: "gemini-2.5-pro" })

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: base64,
      },
    },
    `이 이미지를 분석하세요. 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "is_screenshot": true 또는 false (스크린샷/캡처 여부),
  "type": "tweet|chat|article|recipe|code|whiteboard|email|shopping|map|other" 중 하나,
  "content": "이미지에서 추출한 모든 텍스트 (원문 그대로, 줄바꿈 포함)",
  "summary": "핵심 내용 한 줄 요약 (한국어)",
  "extracted": {
    "urls": ["발견된 URL들"],
    "dates": ["날짜/시간 정보"],
    "todos": ["해야 할 일/액션 아이템"],
    "people": ["언급된 사람/이름"],
    "key_info": ["핵심 정보 (가격, 장소, 전화번호 등)"]
  }
}

규칙:
- is_screenshot=false이면 일반 사진: content에 짧은 설명, extracted는 모두 빈 배열
- is_screenshot=true이면: content에 이미지의 모든 텍스트를 원문 그대로 추출
- type은 스크린샷일 때만 유의미, 일반 사진이면 "other"
- summary는 항상 한국어로 1~2문장
- JSON만 반환하세요`,
  ])

  const text = result.response.text().trim()

  try {
    return JSON.parse(text)
  } catch {
    // Try extracting JSON from markdown code block
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch { /* fall through */ }
    }
    // Fallback: treat as non-screenshot with raw text as description
    return {
      is_screenshot: false,
      type: "other",
      content: text.slice(0, 200),
      summary: text.slice(0, 50),
      extracted: { urls: [], dates: [], todos: [], people: [], key_info: [] },
    }
  }
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
