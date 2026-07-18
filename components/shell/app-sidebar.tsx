"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bot,
  LayoutDashboard,
  MessagesSquare,
  Settings,
} from "lucide-react"

import { NavUser } from "@/components/shell/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import type { AppUser } from "@/lib/session"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/conversations", label: "Conversations", icon: MessagesSquare },
  { href: "/settings", label: "Settings", icon: Settings },
] as const

export function AppSidebar({ user }: { user: AppUser }) {
  const pathname = usePathname()
  const { state } = useSidebar()
  const collapsed = state === "collapsed"

  return (
    <Sidebar collapsible="icon" className="border-r border-white/10 bg-black">
      <SidebarHeader className="gap-3 border-b border-white/5 px-3 py-4">
        <div
          className={cn(
            "flex items-center gap-2",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          {!collapsed && (
            <p className="text-[11px] font-medium tracking-[0.35em] text-white/90">
              NULLXES
            </p>
          )}
          <SidebarTrigger className="size-8 text-white/70 hover:bg-white/5 hover:text-white" />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href)
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
                      className={cn(
                        "text-white/55 hover:bg-white/5 hover:text-white",
                        active && "bg-white/10 text-white"
                      )}
                    >
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/5 p-2">
        <NavUser user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
