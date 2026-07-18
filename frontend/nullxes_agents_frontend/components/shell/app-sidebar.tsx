"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Bot,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  Settings,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { signOut } from "@/lib/auth-client"
import type { AppUser } from "@/lib/session"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/conversations", label: "Conversations", icon: MessagesSquare },
  { href: "/settings", label: "Settings", icon: Settings },
] as const

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function AppSidebar({ user }: { user: AppUser }) {
  const pathname = usePathname()
  const router = useRouter()
  const { state } = useSidebar()
  const collapsed = state === "collapsed"

  const onSignOut = async () => {
    await signOut()
    router.replace("/login")
    router.refresh()
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-white/10 bg-zinc-950">
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
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg px-2 py-2",
            collapsed && "justify-center px-0"
          )}
        >
          <Avatar size="sm" className="ring-1 ring-white/15">
            {user.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
            <AvatarFallback className="bg-zinc-800 text-[10px] text-white/80">
              {initials(user.name || user.email)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-white/90">{user.name}</p>
              <p className="truncate text-[11px] text-white/40">{user.email}</p>
            </div>
          )}
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={() => void onSignOut()}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-white/45 hover:bg-white/5 hover:text-white"
                  aria-label="Выйти"
                />
              }
            >
              <LogOut className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent side="right">Выйти</TooltipContent>
          </Tooltip>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
