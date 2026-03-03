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
    text: `[텍스트 메모 - 다차원 태깅]
- 분야: 이 메모가 속하는 영역 (개발, 디자인, 비즈니스, 학습, 생활, 건강, 재테크, 취미 등)
- 주제: 구체적인 토픽 (react, 마케팅전략, 요리, 운동루틴 등)
- 행동: 어떤 성격의 내용인지 (할일, 아이디어, 회의록, 리뷰, 일정, 참고자료, 일기, 인사이트 등)
- 맥락: 관련 프로젝트/상황이 명확하면 추가 (예: "q3-기획", "이직준비")`,
    link: `[링크/URL - 다차원 태깅]
- 분야: 링크 콘텐츠의 도메인 영역 (기술, 비즈니스, 라이프, 뉴스, 학술 등)
- 주제: 기사/문서의 핵심 토픽 (typescript, 투자전략, 레시피 등)
- 형식: 콘텐츠 형태 (튜토리얼, 블로그, 뉴스, 공식문서, 영상, 논문 등)
- 활용: 왜 저장했을지 추론 (참고자료, 나중에-읽기, 도구, 영감 등)`,
    image: `[이미지 - 다차원 태깅]
- 분야: 이미지가 속하는 영역 (업무, 학습, 여행, 음식, 쇼핑 등)
- 주제: 이미지의 구체적 내용 (코드, 에러로그, 디자인, 영수증, 메뉴판 등)
- 유형: 스크린샷/사진/문서/도표/화이트보드 등`,
    voice: `[음성 메모 - 다차원 태깅]
- 분야: 음성의 주제 영역 (업무, 학습, 생활, 아이디어 등)
- 주제: 구체적 토픽 (회의내용, 강의정리, 일정메모 등)
- 행동: 어떤 성격인지 (브레인스토밍, 회의록, 할일메모, 생각정리 등)
- 구어체 특성상 핵심만 추출. 말버릇/감탄사 무시`,
  }

  const guidance = typeGuidance[type] || typeGuidance.text

  const prompt = `콘텐츠를 분석하여 3~5개의 다차원 태그를 생성하세요.

${guidance}

[태깅 전략]
1단계: 콘텐츠를 깊이 이해 — 무엇에 관한 것인지, 왜 저장했을지, 나중에 어떤 검색어로 찾을지 생각
2단계: 분야(domain) 태그 1개 — 가장 넓은 카테고리
3단계: 주제(topic) 태그 1~2개 — 구체적인 토픽
4단계: 행동/유형(action) 태그 1개 — 콘텐츠의 성격이나 활용 목적
5단계: 맥락(context) 태그 0~1개 — 특정 프로젝트/상황이 명확할 때만

[규칙]
1. 태그는 소문자. 영문 또는 한글. 1~2단어 (예: "react", "회의록", "web-dev", "나중에-읽기")
2. 기존 태그가 의미상 맞으면 무조건 재사용 (동의어 금지: "개발"이 있으면 "프로그래밍" 쓰지 말 것)
3. 금지 태그: "일반", "기타", "메모", "general", "other", "misc", "note", "stuff", "image", "link", "voice", "text", "url", "사진", "음성", "링크"
4. 콘텐츠 유형 자체를 태그로 쓰지 마세요
5. 최소 3개, 최대 5개. 의미 없는 태그 절대 금지
6. 나중에 이 항목을 검색할 때 유용한 태그를 우선시
${freqSection}

[예시]
"React 리팩토링 — 불필요한 리렌더링 줄이기" → ["개발", "react", "리팩토링", "성능최적화"]
"팀 회의 Q3 목표 논의. 매출 20% 성장" → ["비즈니스", "회의록", "q3-목표"]
"TypeScript 5.0 새 기능 - 공식 블로그" → ["개발", "typescript", "공식문서"]
"투자 트렌드: AI 관련주 분석" → ["재테크", "투자", "ai", "트렌드분석"]

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
        .slice(0, 5)
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
  if (content.length < 50) return null

  const model = getGenAI().getGenerativeModel({ model: "gemini-2.0-flash" })

  const result = await model.generateContent(
    `다음 콘텐츠를 한국어로 핵심 요약하세요.

규칙:
- 1~2문장, 최대 80자
- 콘텐츠의 핵심 가치/의미를 담아야 함
- "~에 대한 내용" 같은 메타 설명 금지. 직접적인 요약만.
- 원문이 한국어면 한국어로, 영어면 한국어로 번역 요약
- 요약문만 반환. 다른 텍스트 없이.

콘텐츠: ${content}`
  )

  return result.response.text().trim() || null
}

export async function generateInsight(content: string, type: string): Promise<string | null> {
  if (!content || content.length < 10) return null

  const model = getGenAI().getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { temperature: 0.7 },
  })

  const result = await model.generateContent(
    `사용자가 저장한 콘텐츠를 읽고, 짧고 임팩트 있는 AI 코멘트를 달아주세요.

역할: 사용자의 지식 동반자. 공감하고, 연결하고, 격려하는 톤.

코멘트 유형 (콘텐츠에 맞게 자동 선택):
- 아이디어면: 확장 가능성이나 연결 포인트 제시 ("이 아이디어를 ~와 결합하면 더 강력해질 수 있어요")
- 학습/기술이면: 핵심 인사이트 강조 또는 실천 팁 ("핵심은 ~이네요. 바로 적용해볼 만해요")
- 할 일/계획이면: 우선순위나 실행 팁 ("가장 임팩트가 큰 건 ~ 부분이에요")
- 링크/참고자료면: 왜 가치있는지, 어떻게 활용할지 ("이 자료의 핵심은 ~. 나중에 ~ 할 때 유용해요")
- 일상/감정이면: 공감과 격려 ("좋은 기록이에요. 이런 순간을 남기는 게 중요해요")

규칙:
- 1~2문장, 최대 80자
- 한국어로 작성
- "~입니다" 대신 "~이에요/~해요" 친근한 톤
- 콘텐츠만 반환. 다른 텍스트 없이.

콘텐츠 유형: ${type}
콘텐츠: ${content}`
  )

  return result.response.text().trim() || null
}

export async function generateLinkAnalysis(
  url: string,
  ogTitle?: string,
  ogDescription?: string
): Promise<string | null> {
  const context = [ogTitle, ogDescription, url].filter(Boolean).join(" — ")
  if (!context || context.length < 10) return null

  const model = getGenAI().getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { temperature: 0.5 },
  })

  const result = await model.generateContent(
    `URL과 메타데이터를 분석하여 이 링크의 핵심 내용을 정리해주세요.

정보:
- URL: ${url}
${ogTitle ? `- 제목: ${ogTitle}` : ""}
${ogDescription ? `- 설명: ${ogDescription}` : ""}

아래 형식으로 작성:
- 한 줄 요약 (이 링크가 무엇인지)
- 핵심 포인트 1~2개 (왜 읽어볼 만한지)
- 활용 팁 (나중에 어떻게 써먹을 수 있는지)

규칙:
- 전체 3~4줄, 최대 150자
- 한국어로 작성
- 친근한 톤 ("~이에요/~해요")
- 마크다운 없이 플레인 텍스트만
- 정보가 부족하면 URL 도메인과 경로에서 추론
- 내용만 반환. 라벨("한 줄 요약:", "핵심:") 붙이지 마세요.`)

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
