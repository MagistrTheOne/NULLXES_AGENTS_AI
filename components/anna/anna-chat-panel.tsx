"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowUp, LoaderCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ChatMessage } from "@/lib/agent-api"
import { cn } from "@/lib/utils"

type Props = {
  turns: ChatMessage[]
  phase: string
  connected: boolean
  sessionOn: boolean
  onSend: (text: string) => Promise<void>
  className?: string
}

export function AnnaChatPanel({
  turns,
  phase,
  connected,
  sessionOn,
  onSend,
  className,
}: Props) {
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [turns, phase])

  const busy = sending || phase === "thinking" || phase === "speaking"
  const canSend = sessionOn && connected && !sending && !!draft.trim()

  const submit = async () => {
    const text = draft.trim()
    if (!text || !canSend) return
    setSending(true)
    setDraft("")
    try {
      await onSend(text)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-1 pb-3">
        {turns.length === 0 ? (
          <p className="text-sm text-white/40">
            {sessionOn
              ? connected
                ? "Напиши сообщение — ответ уйдёт в Anam (TTS + lip-sync)."
                : "Подключаем сессию…"
              : "Start session, затем пиши сюда или внизу."}
          </p>
        ) : (
          turns.map((t, i) => (
            <div
              key={`${t.role}-${i}-${t.content.slice(0, 24)}`}
              className={cn(
                "max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                t.role === "user"
                  ? "ml-auto bg-white/10 text-white"
                  : "bg-zinc-900 text-white/90 ring-1 ring-white/10"
              )}
            >
              {t.content}
            </div>
          ))
        )}

        {phase === "thinking" ? (
          <div className="flex items-center gap-2 text-xs text-white/40">
            <LoaderCircle className="size-3.5 animate-spin" />
            Thinking…
          </div>
        ) : null}
        {phase === "speaking" ? (
          <div className="text-xs text-white/40">Speaking…</div>
        ) : null}
        <div ref={endRef} />
      </div>

      <form
        className="flex shrink-0 items-center gap-2 rounded-2xl bg-zinc-900 px-3 py-2 ring-1 ring-white/10 [&_input::placeholder]:text-white/30"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            !sessionOn
              ? "Сначала Start…"
              : !connected
                ? "Connecting…"
                : "Сообщение Анне…"
          }
          disabled={!sessionOn || !connected || sending}
          className="h-10 border-0 bg-transparent text-sm text-white focus-visible:ring-0"
        />
        <Button
          type="submit"
          size="icon"
          variant="secondary"
          disabled={!canSend}
          className="size-9 shrink-0 rounded-full bg-white text-black hover:bg-white/90 disabled:opacity-40"
          aria-label="Send"
        >
          {busy && sending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <ArrowUp className="size-4" />
          )}
        </Button>
      </form>
    </div>
  )
}
