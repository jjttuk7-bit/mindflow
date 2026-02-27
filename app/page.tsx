"use client"

import { Sidebar } from "@/components/sidebar"
import { MainFeed } from "@/components/main-feed"
import { useItems } from "@/hooks/use-items"

export default function Home() {
  const { refetch } = useItems()

  return (
    <div className="flex h-screen">
      <Sidebar />
      <MainFeed onRefetch={refetch} />
    </div>
  )
}
