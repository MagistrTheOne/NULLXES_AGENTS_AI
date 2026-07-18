import { headers } from "next/headers"

import { auth } from "@/lib/auth"

export type AppUser = {
  id: string
  name: string
  email: string
  image?: string | null
}

export async function requireSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  return session
}

export function toAppUser(
  user: { id: string; name: string; email: string; image?: string | null } | null | undefined
): AppUser | null {
  if (!user) return null
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
  }
}
