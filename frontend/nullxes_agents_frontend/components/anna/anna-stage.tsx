"use client"

import { useEffect, useState } from "react"

import { fetchAnamPersona, type AnamPersonaPreview } from "@/lib/agent-api"
import { cn } from "@/lib/utils"

type AnnaStageProps = {
  videoElementId: string
  live: boolean
  className?: string
}

const PERSONA_REFRESH_MS = 25 * 60 * 1000

export function AnnaStage({ videoElementId, live, className }: AnnaStageProps) {
  const [persona, setPersona] = useState<AnamPersonaPreview | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const next = await fetchAnamPersona()
        if (!cancelled) setPersona(next)
      } catch {
        /* preview optional while live */
      }
    }
    void load()
    const timer = setInterval(() => void load(), PERSONA_REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    if (live) return
    const el = document.getElementById(videoElementId) as HTMLVideoElement | null
    if (!el) return
    const src = persona?.idleVideoUrl || persona?.videoUrl || ""
    if (!src) return
    if (el.src !== src) {
      el.src = src
      el.load()
    }
    void el.play().catch(() => undefined)
  }, [persona, live, videoElementId])

  const poster =
    persona?.landscapeImageUrl ||
    persona?.imageUrl ||
    persona?.portraitImageUrl ||
    undefined

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] bg-zinc-950 ring-1 ring-white/10",
        className
      )}
    >
      <video
        id={videoElementId}
        className="absolute inset-0 size-full object-cover"
        poster={poster}
        muted={!live}
        loop={!live}
        playsInline
        autoPlay
      />

      {!persona && !live ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black text-sm text-white/50">
          Загрузка Anam…
        </div>
      ) : null}
    </div>
  )
}
