import { getUser } from "@/lib/supabase/server"
import { getOpenAI, MODEL_MAP } from "@/lib/ai"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function extractText(buffer: ArrayBuffer, fileName: string, contentType: string): Promise<string> {
  const lower = fileName.toLowerCase()

  // Plain text / CSV
  if (contentType.includes("text") || lower.endsWith(".txt") || lower.endsWith(".csv") || lower.endsWith(".md")) {
    return new TextDecoder().decode(buffer).slice(0, 20000)
  }

  // PDF
  if (contentType.includes("pdf") || lower.endsWith(".pdf")) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>
      const result = await pdfParse(Buffer.from(buffer))
      return result.text.slice(0, 20000)
    } catch (e) {
      console.error("PDF parse error:", e)
      return ""
    }
  }

  // DOCX
  if (contentType.includes("word") || lower.endsWith(".docx")) {
    try {
      const mammoth = await import("mammoth")
      const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) })
      return result.value.slice(0, 20000)
    } catch (e) {
      console.error("DOCX parse error:", e)
      return ""
    }
  }

  return ""
}

export async function POST(req: NextRequest) {
  const { user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { itemId, fileUrl, fileName } = await req.json()
  if (!itemId || !fileUrl) {
    return NextResponse.json({ error: "Missing itemId or fileUrl" }, { status: 400 })
  }

  // Fetch the file
  const fileRes = await fetch(fileUrl, { signal: AbortSignal.timeout(30000) })
  if (!fileRes.ok) {
    return NextResponse.json({ error: "Failed to fetch file" }, { status: 500 })
  }

  const buffer = await fileRes.arrayBuffer()
  const contentType = fileRes.headers.get("content-type") || ""

  // Extract text
  const extractedText = await extractText(buffer, fileName || "", contentType)
  if (!extractedText.trim()) {
    return NextResponse.json({ error: "Could not extract text from file" }, { status: 400 })
  }

  // AI Summary
  const openai = getOpenAI()
  const completion = await openai.chat.completions.create({
    model: MODEL_MAP.summary,
    messages: [
      {
        role: "system",
        content: `You are a document summarizer. Summarize the given document content concisely in Korean.
- Provide a 2-4 sentence summary capturing the key points
- If it's a table/spreadsheet, describe the data structure and key findings
- If it's a contract/legal document, highlight key terms and dates
- Keep it brief but informative`,
      },
      {
        role: "user",
        content: `파일명: ${fileName}\n\n문서 내용:\n${extractedText.slice(0, 8000)}`,
      },
    ],
    max_tokens: 300,
    temperature: 0.3,
  })

  const summary = completion.choices[0]?.message?.content?.trim() || ""

  // Update item metadata
  const supabase = getSupabaseAdmin()
  const { data: item } = await supabase
    .from("items")
    .select("metadata, content")
    .eq("id", itemId)
    .eq("user_id", user.id)
    .single()

  if (item) {
    const currentMeta = (item.metadata || {}) as Record<string, unknown>
    await supabase
      .from("items")
      .update({
        metadata: {
          ...currentMeta,
          extracted_text: extractedText.slice(0, 5000),
          ai_summary: summary,
        },
        content: item.content === "File" && summary ? summary.slice(0, 200) : item.content,
      })
      .eq("id", itemId)
  }

  return NextResponse.json({
    summary,
    extracted_text: extractedText.slice(0, 5000),
  })
}
