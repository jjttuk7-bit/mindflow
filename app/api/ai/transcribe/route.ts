import { transcribeAudio } from "@/lib/ai"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const audioFile = formData.get("audio") as File | null

  if (!audioFile) {
    return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
  }

  try {
    const transcript = await transcribeAudio(audioFile)
    return NextResponse.json({ transcript })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transcription failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
