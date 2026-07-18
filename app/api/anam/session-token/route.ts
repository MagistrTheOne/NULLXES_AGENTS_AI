import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"

const ANAM_API = "https://api.anam.ai/v1"

/**
 * Stateful persona + CUSTOMER_CLIENT_V1 — brain на нашей стороне
 * (см. https://anam.ai/docs/javascript-sdk/examples/custom-llm)
 */
export async function POST() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  const apiKey = process.env.ANAM_API_KEY
  const personaId = process.env.ANAM_PERSONA_ID
  if (!apiKey || !personaId) {
    return NextResponse.json(
      { ok: false, error: "ANAM_API_KEY / ANAM_PERSONA_ID missing" },
      { status: 500 }
    )
  }

  try {
    const res = await fetch(`${ANAM_API}/auth/session-token`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        personaConfig: {
          personaId,
          llmId: "CUSTOMER_CLIENT_V1",
        },
      }),
      cache: "no-store",
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: data?.message || data?.error || `anam ${res.status}` },
        { status: 502 }
      )
    }
    const sessionToken = data.sessionToken || data.session_token
    if (!sessionToken) {
      return NextResponse.json(
        { ok: false, error: "empty sessionToken" },
        { status: 502 }
      )
    }
    return NextResponse.json({ ok: true, sessionToken, personaId })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "session-token failed" },
      { status: 500 }
    )
  }
}
