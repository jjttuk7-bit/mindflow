import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "로그인",
  description: "DotLine에 로그인하거나 새 계정을 만드세요.",
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
