import { createClient } from "@/lib/supabase/server"
import { SalesDashboard } from "@/components/sales/sales-dashboard"
import { SalesLanding } from "@/components/sales/sales-landing"

export const metadata = {
  title: "Sales | DotLine",
  description: "AI 기반 고객 관계 관리 - DotLine Sales",
}

export default async function SalesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <SalesLanding />
  }

  return <SalesDashboard />
}
