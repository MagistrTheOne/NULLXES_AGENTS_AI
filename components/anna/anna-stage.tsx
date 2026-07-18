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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const next = await fetchAnamPersona()
        if (!cancelled) setPersona(next)
      } catch {
        /* preview optional */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    const timer = setInterval(() => void load(), PERSONA_REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  // Idle preview: только постер, без autoplay idle/talking video
  // (иначе выглядит как будто сессия уже идёт)
  useEffect(() => {
    const el = document.getElementById(videoElementId) as HTMLVideoElement | null
    if (!el) return
    if (!live) {
      el.pause()
      el.removeAttribute("src")
      el.load()
    }
  }, [live, videoElementId])

  const poster =
    persona?.landscapeImageUrl ||
    persona?.imageUrl ||
    persona?.portraitImageUrl ||
    undefined

  const showBoot = loading && !live && !persona

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] bg-zinc-950 ring-1 ring-white/10",
        className
      )}
    >
      {poster && !live ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt="Anna Maria"
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}

      <video
        id={videoElementId}
        className={cn(
          "absolute inset-0 size-full object-cover",
          !live && "opacity-0"
        )}
        poster={poster}
        muted={!live}
        playsInline
        autoPlay={live}
      />

      {showBoot ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-white/40" />
            <span className="relative inline-flex size-2 rounded-full bg-white/70" />
          </span>
          <p className="animate-pulse text-sm tracking-wide text-white/50">
            Загружаем сущность
          </p>
        </div>
      ) : null}
    </div>
  )
}
