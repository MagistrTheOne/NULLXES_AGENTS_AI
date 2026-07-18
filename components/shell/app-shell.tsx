"use client"

import { AppSidebar } from "@/components/shell/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
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
        <SidebarInset className="flex min-h-dvh min-w-0 flex-col bg-black">
          <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2 md:hidden">
            <SidebarTrigger className="size-9 text-white/70 hover:bg-white/5 hover:text-white" />
            <p className="text-[11px] font-medium tracking-[0.35em] text-white/80">
              NULLXES
            </p>
          </div>
          <div className="min-h-0 min-w-0 flex-1">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
