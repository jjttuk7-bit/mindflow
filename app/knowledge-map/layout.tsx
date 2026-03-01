import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Knowledge Map",
  description: "저장한 지식 간의 연결 관계를 시각적으로 탐색하세요.",
}

export default function KnowledgeMapLayout({ children }: { children: React.ReactNode }) {
  return children
}
