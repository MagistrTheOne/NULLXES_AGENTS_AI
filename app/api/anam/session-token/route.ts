import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"

const ANAM_API = "https://api.anam.ai/v1"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * ElevenLabs Voice ID → Anam voice UUID.
 * Canonical: ELEVENLABS_VOICE_ID=zEDquLSb8Y0QVTR5PmMv
 * Docs: https://anam.ai/docs/personas/voices/custom-voices
 */
async function resolveAnamVoiceId(
  apiKey: string,
  elevenLabsVoiceId: string,
  preferredAnamVoiceId?: string
): Promise<{ anamVoiceId: string; providerVoiceId: string }> {
  const providerVoiceId = elevenLabsVoiceId.trim()
  if (!providerVoiceId) {
    throw new Error("ELEVENLABS_VOICE_ID missing")
  }

  // Prefer cached Anam UUID if it still maps to our ElevenLabs id
  if (preferredAnamVoiceId && UUID_RE.test(preferredAnamVoiceId)) {
    try {
      const one = await fetch(`${ANAM_API}/voices/${preferredAnamVoiceId}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
      })
      if (one.ok) {
        const voice = await one.json()
        if (voice?.providerVoiceId === providerVoiceId && voice?.id) {
          return { anamVoiceId: String(voice.id), providerVoiceId }
        }
      }
    } catch {
      /* fall through */
    }
  }

  const listRes = await fetch(`${ANAM_API}/voices?limit=100`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })
  if (listRes.ok) {
    const payload = await listRes.json()
    const voices = (payload.data || payload.voices || []) as Array<{
      id?: string
      providerVoiceId?: string
    }>
    const found = voices.find((v) => v.providerVoiceId === providerVoiceId)
    if (found?.id) {
      return { anamVoiceId: String(found.id), providerVoiceId }
    }
  }

  // Import public / shared ElevenLabs voice into org
  // https://anam.ai/docs/personas/voices/custom-voices
  const createRes = await fetch(`${ANAM_API}/voices`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      provider: "ELEVENLABS",
      providerVoiceId,
      displayName: "Anna Maria",
    }),
    cache: "no-store",
  })
  const created = await createRes.json().catch(() => ({}))
  if (!createRes.ok || !created?.id) {
    throw new Error(
      created?.message ||
        created?.error ||
        "Не удалось импортировать ElevenLabs voice в Anam. Для cloned PVC нужен share link → support@anam.ai (см. custom-voices)."
    )
  }

  return { anamVoiceId: String(created.id), providerVoiceId }
}

/**
 * CUSTOMER_CLIENT_V1 brain + ElevenLabs voice + Russian STT.
 * https://anam.ai/docs/javascript-sdk/examples/custom-llm
 * https://anam.ai/docs/personas/voices/multilingual
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
  const elevenLabsVoiceId = process.env.ELEVENLABS_VOICE_ID?.trim() || ""
  const preferredAnamVoiceId = process.env.ANAM_VOICE_ID?.trim() || ""

  if (!apiKey || !personaId) {
    return NextResponse.json(
      { ok: false, error: "ANAM_API_KEY / ANAM_PERSONA_ID missing" },
      { status: 500 }
    )
  }
  if (!elevenLabsVoiceId) {
    return NextResponse.json(
      { ok: false, error: "ELEVENLABS_VOICE_ID missing (zEDquLSb8Y0QVTR5PmMv)" },
      { status: 500 }
    )
  }

  try {
    let avatarId = process.env.ANAM_AVATAR_ID?.trim() || ""
    let personaName = "Anna Maria"

    try {
      const personaRes = await fetch(`${ANAM_API}/personas/${personaId}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
      })
      if (personaRes.ok) {
        const persona = await personaRes.json()
        personaName = persona.name || personaName
        const published = persona.publishedCall?.avatar
        const avatar = persona.avatar
        avatarId =
          avatarId ||
          published?.id ||
          avatar?.id ||
          persona.avatarId ||
          ""
      }
    } catch {
      /* keep env */
    }

    if (!avatarId) {
      return NextResponse.json(
        { ok: false, error: "avatarId missing for persona" },
        { status: 500 }
      )
    }

    const { anamVoiceId, providerVoiceId } = await resolveAnamVoiceId(
      apiKey,
      elevenLabsVoiceId,
      preferredAnamVoiceId
    )

    const personaConfig = {
      name: personaName,
      avatarId,
      voiceId: anamVoiceId,
      llmId: "CUSTOMER_CLIENT_V1",
      // https://anam.ai/docs/personas/voices/multilingual
      languageCode: "ru",
    }

    const res = await fetch(`${ANAM_API}/auth/session-token`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ personaConfig }),
      cache: "no-store",
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: data?.message || data?.error || `anam ${res.status}`,
        },
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
    return NextResponse.json({
      ok: true,
      sessionToken,
      personaId,
      voiceId: anamVoiceId,
      elevenLabsVoiceId: providerVoiceId,
      avatarId,
      languageCode: "ru",
    })
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "session-token failed",
      },
      { status: 500 }
    )
  }
}
