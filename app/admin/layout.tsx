import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "관리자",
  description: "Mindflow 관리자 대시보드",
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children
}
