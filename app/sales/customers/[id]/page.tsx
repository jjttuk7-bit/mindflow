import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CustomerDetail } from "@/components/sales/customer-detail"

export const metadata = {
  title: "Customer Detail | DotLine Sales",
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { id } = await params

  return <CustomerDetail customerId={id} />
}
