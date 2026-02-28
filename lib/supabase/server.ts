import { createServerClient } from "@supabase/ssr"
import { createClient as createJsClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedBypassUser: any = null

export async function getUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (user) return { supabase, user, error }

  // When BYPASS_AUTH is enabled and no session exists, use admin client
  if (process.env.BYPASS_AUTH === "true") {
    const adminClient = createJsClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (!cachedBypassUser) {
      const { data } = await adminClient.auth.admin.listUsers({ perPage: 1 })
      cachedBypassUser = data?.users?.[0] ?? {
        id: "00000000-0000-0000-0000-000000000000",
        email: "bypass@dev",
      }
    }

    return { supabase: adminClient, user: cachedBypassUser, error: null }
  }

  return { supabase, user, error }
}
