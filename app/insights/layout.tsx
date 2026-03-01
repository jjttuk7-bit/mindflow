import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "인사이트",
  description: "AI가 분석한 나의 사고 패턴과 주간 인사이트를 확인하세요.",
}

export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  return children
}
