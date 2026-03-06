import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const bucket = formData.get("bucket") as string | null

  if (!file || !bucket) {
    return NextResponse.json({ error: "Missing file or bucket" }, { status: 400 })
  }

  if (!["items-images", "items-audio", "items-files"].includes(bucket)) {
    return NextResponse.json({ error: "Invalid bucket" }, { status: 400 })
  }

  const ext = file.name.split(".").pop()
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error } = await getSupabaseAdmin().storage
    .from(bucket)
    .upload(path, arrayBuffer, { contentType: file.type })

  if (error) {
    console.error("Upload error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data } = getSupabaseAdmin().storage.from(bucket).getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
