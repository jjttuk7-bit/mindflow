"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { LogOut, User } from "lucide-react"

export function UserMenu() {
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null)
    })
  }, [supabase.auth])

  async function handleSignOut() {
    setLoading(true)
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  if (!email) return null

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <User className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-xs text-muted-foreground truncate">
          {email}
        </span>
      </div>
      <button
        onClick={handleSignOut}
        disabled={loading}
        className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-all duration-200 flex-shrink-0"
        aria-label="Sign out"
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
