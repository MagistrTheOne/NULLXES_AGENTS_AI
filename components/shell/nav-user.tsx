"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronsUpDown, LogOut, Settings } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSidebar } from "@/components/ui/sidebar"
import { signOut, useSession } from "@/lib/auth-client"
import type { AppUser } from "@/lib/session"
import { cn } from "@/lib/utils"

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function NavUser({ user: initialUser }: { user: AppUser }) {
  const router = useRouter()
  const { isMobile, state } = useSidebar()
  const { data } = useSession()
  const collapsed = state === "collapsed"

  const user: AppUser = data?.user
    ? {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        image: data.user.image,
      }
    : initialUser

  const onSignOut = async () => {
    await signOut()
    router.replace("/login")
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left outline-none ring-sidebar-ring transition-colors hover:bg-white/5 focus-visible:ring-2 data-popup-open:bg-white/5",
              collapsed && "justify-center px-0"
            )}
          />
        }
      >
        <Avatar size="sm" className="ring-1 ring-white/15">
          {user.image ? (
            <AvatarImage src={user.image} alt={user.name} />
          ) : null}
          <AvatarFallback className="bg-neutral-950 text-[10px] text-white/80">
            {initials(user.name || user.email)}
          </AvatarFallback>
        </Avatar>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-white/90">{user.name}</p>
              <p className="truncate text-[11px] text-white/40">{user.email}</p>
            </div>
            <ChevronsUpDown className="size-3.5 shrink-0 text-white/35" />
          </>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="min-w-56 rounded-xl border-white/10 bg-zinc-950 text-white"
        side={isMobile ? "bottom" : "right"}
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center gap-2 px-2 py-2">
          <Avatar size="sm" className="ring-1 ring-white/15">
            {user.image ? (
              <AvatarImage src={user.image} alt={user.name} />
            ) : null}
            <AvatarFallback className="bg-neutral-950 text-[10px] text-white/80">
              {initials(user.name || user.email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm normal-case tracking-normal text-white">
              {user.name}
            </p>
            <p className="truncate text-[11px] normal-case tracking-normal text-white/40">
              {user.email}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="gap-2 normal-case tracking-normal"
            render={<Link href="/settings" />}
          >
            <Settings className="size-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2 normal-case tracking-normal"
            onClick={() => void onSignOut()}
          >
            <LogOut className="size-4" />
            Выйти
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
