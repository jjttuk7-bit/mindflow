import { createClient } from "@supabase/supabase-js"
import { NextRequest } from "next/server"

/**
 * Extract and validate a Supabase user from a Bearer token.
 * Used by extension API routes that authenticate via Authorization header
 * instead of cookies.
 */
export async function getUserFromToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return { user: null, error: "Missing or invalid Authorization header" }
  }

  const token = authHeader.slice(7)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return { user: null, supabase: null, error: error?.message || "Invalid token" }
  }

  return { user, supabase, error: null }
}
