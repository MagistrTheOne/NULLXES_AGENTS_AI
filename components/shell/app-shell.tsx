"use client"

import { AppSidebar } from "@/components/shell/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { AppUser } from "@/lib/session"

export function AppShell({
  user,
  children,
}: {
  user: AppUser
  children: React.ReactNode
}) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen className="min-h-dvh bg-black text-white">
        <AppSidebar user={user} />
        <SidebarInset className="min-h-dvh bg-black">{children}</SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
