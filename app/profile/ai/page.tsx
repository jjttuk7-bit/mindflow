import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AIProfile } from "@/components/ai-profile"

export default async function AIProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return <AIProfile />
}
