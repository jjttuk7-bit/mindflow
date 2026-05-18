import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

let _client: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  // During SSR (next build static generation), NEXT_PUBLIC_ vars are not
  // injected into the Turbopack SSR bundle. Return a safe stub so prerender
  // never calls createBrowserClient with undefined values.
  // All real auth calls happen in useEffect / event handlers (browser only).
  if (typeof window === "undefined") {
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        signOut: async () => ({ error: null }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
        signUp: async () => ({ data: { user: null, session: null }, error: null }),
        signInWithOAuth: async () => ({ data: { provider: "", url: "" }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
    } as unknown as SupabaseClient
  }

  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _client
}
