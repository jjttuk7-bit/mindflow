import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "설정",
  description: "계정, 연동, 구독 등 DotLine 설정을 관리하세요.",
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
