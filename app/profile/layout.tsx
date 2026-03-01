import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "프로필",
  description: "공개 프로필에서 공유된 생각과 아이디어를 확인하세요.",
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children
}
