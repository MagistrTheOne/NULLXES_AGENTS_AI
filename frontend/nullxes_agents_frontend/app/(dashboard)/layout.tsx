import { redirect } from "next/navigation"

import { AppShell } from "@/components/shell/app-shell"
import { requireSession, toAppUser } from "@/lib/session"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireSession()
  const user = toAppUser(session?.user)
  if (!user) redirect("/login")

  return <AppShell user={user}>{children}</AppShell>
}
