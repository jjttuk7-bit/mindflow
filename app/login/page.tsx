import type { Metadata } from "next"
import dynamicLoad from "next/dynamic"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "로그인",
}

// ssr: false — prevents LoginForm from being server-rendered during build,
// avoiding Supabase client initialization before env vars are available
const LoginForm = dynamicLoad(
  () => import("./login-form").then(m => ({ default: m.LoginForm })),
  { ssr: false }
)

export default function LoginPage() {
  return <LoginForm />
}
