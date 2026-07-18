import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"

const ANAM_API = "https://api.anam.ai/v1"

export async function GET() {
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
    const res = await fetch(`${ANAM_API}/personas/${personaId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    })
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `anam persona ${res.status}` },
        { status: 502 }
      )
    }
    const persona = await res.json()
    const avatar = persona.avatar || {}
    const published = persona.publishedCall?.avatar || {}
    const src =
      published.imageUrl || published.idleVideoUrl ? published : avatar

    return NextResponse.json({
      ok: true,
      persona: {
        id: persona.id || personaId,
        name: persona.name || "Anna Maria Nullxes",
        description: persona.description || "",
        imageUrl: src.imageUrl || avatar.imageUrl || "",
        landscapeImageUrl:
          src.landscapeImageUrl || avatar.landscapeImageUrl || "",
        portraitImageUrl: src.portraitImageUrl || avatar.portraitImageUrl || "",
        idleVideoUrl: src.idleVideoUrl || avatar.idleVideoUrl || "",
        videoUrl: src.videoUrl || avatar.videoUrl || "",
        avatarId: src.id || avatar.id || "",
      },
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "persona failed" },
      { status: 500 }
    )
  }
}
