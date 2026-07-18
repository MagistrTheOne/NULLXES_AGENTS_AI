import { NextRequest, NextResponse } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = getSessionCookie(request)

  const isAuthPage = pathname === "/login" || pathname === "/register"
  const isProtected =
    pathname === "/" ||
    pathname.startsWith("/agents") ||
    pathname.startsWith("/conversations") ||
    pathname.startsWith("/settings")

  if (isProtected && !sessionCookie) {
    const login = new URL("/login", request.url)
    login.searchParams.set("next", pathname)
    return NextResponse.redirect(login)
  }

  if (isAuthPage && sessionCookie) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/agents/:path*",
    "/conversations/:path*",
    "/settings/:path*",
  ],
}
