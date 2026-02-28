import { describeImage } from "@/lib/ai"
import { getUser } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get("image") as File | null

  if (!file || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "No image file provided" }, { status: 400 })
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")
    const description = await describeImage(base64, file.type)
    return NextResponse.json({ description })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image description failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
