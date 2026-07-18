import Link from "next/link"

import { Badge } from "@/components/ui/badge"

export default function AgentsPage() {
  const elevenLabsVoice =
    process.env.ELEVENLABS_VOICE_ID || "zEDquLSb8Y0QVTR5PmMv"
  const personaId = process.env.ANAM_PERSONA_ID || "—"
  const avatarId = process.env.ANAM_AVATAR_ID || "—"

  return (
    <main className="flex min-h-dvh flex-col px-6 py-8 md:px-10">
      <p className="text-[11px] font-medium tracking-[0.35em] text-white/50">
        AGENTS
      </p>
      <h1 className="mt-3 font-heading text-3xl font-medium tracking-tight text-white">
        Агенты NULLXES
      </h1>
      <p className="mt-2 max-w-lg text-sm text-white/45">
        Управление Digital Executive. Голос — твой ElevenLabs, лицо — Anam.
      </p>

      <article className="mt-10 max-w-xl rounded-2xl bg-zinc-950 p-6 ring-1 ring-white/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-2xl text-white">Anna Maria</h2>
            <p className="mt-1 text-sm text-white/45">Digital Executive</p>
          </div>
          <Badge
            variant="secondary"
            className="normal-case tracking-normal text-emerald-300/80"
          >
            Live-ready
          </Badge>
        </div>

        <dl className="mt-6 space-y-3 text-sm">
          <div>
            <dt className="text-white/40">ElevenLabs Voice ID</dt>
            <dd className="mt-1 break-all font-mono text-xs text-white/80">
              {elevenLabsVoice}
            </dd>
          </div>
          <div>
            <dt className="text-white/40">Anam Persona</dt>
            <dd className="mt-1 break-all font-mono text-xs text-white/80">
              {personaId}
            </dd>
          </div>
          <div>
            <dt className="text-white/40">Anam Avatar</dt>
            <dd className="mt-1 break-all font-mono text-xs text-white/80">
              {avatarId}
            </dd>
          </div>
          <div>
            <dt className="text-white/40">STT</dt>
            <dd className="mt-1 text-white/80">languageCode · ru</dd>
          </div>
          <div>
            <dt className="text-white/40">Brain</dt>
            <dd className="mt-1 text-white/80">
              CUSTOMER_CLIENT_V1 → /api/chat-stream
            </dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-wrap gap-2">
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-xl bg-white px-6 text-xs font-semibold tracking-widest text-black uppercase hover:bg-white/90"
          >
            Открыть консоль
          </Link>
          <Link
            href="/conversations"
            className="inline-flex h-10 items-center rounded-xl bg-white/5 px-6 text-xs font-semibold tracking-widest text-white uppercase hover:bg-white/10"
          >
            История
          </Link>
        </div>
      </article>
    </main>
  )
}
