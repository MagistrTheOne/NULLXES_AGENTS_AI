"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient, type AnamClient } from "@anam-ai/js-sdk"
import { AnamEvent } from "@anam-ai/js-sdk"

import {
  fetchAnamSessionToken,
  streamChat,
  type ChatMessage,
} from "@/lib/agent-api"

export type SessionPhase =
  | "idle"
  | "connecting"
  | "ready"
  | "listening"
  | "thinking"
  | "speaking"
  | "error"

type Options = {
  videoElementId: string
  enabled: boolean
  micEnabled: boolean
  onTurns?: (turns: ChatMessage[]) => void
}

export function useAnamSession({
  videoElementId,
  enabled,
  micEnabled,
  onTurns,
}: Options) {
  const clientRef = useRef<AnamClient | null>(null)
  const busyRef = useRef(false)
  const lastUserRef = useRef("")
  const abortRef = useRef<AbortController | null>(null)
  const turnsRef = useRef<ChatMessage[]>([])
  const onTurnsRef = useRef(onTurns)
  onTurnsRef.current = onTurns

  const [phase, setPhase] = useState<SessionPhase>("idle")
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)

  const pushTurns = useCallback((next: ChatMessage[]) => {
    turnsRef.current = next
    onTurnsRef.current?.(next)
  }, [])

  const respondToHistory = useCallback(async (history: ChatMessage[]) => {
    const client = clientRef.current
    if (!client?.isStreaming() || busyRef.current) return
    if (!history.length) return
    const last = history[history.length - 1]
    if (last.role !== "user") return
    if (last.content === lastUserRef.current) return

    lastUserRef.current = last.content
    busyRef.current = true
    setPhase("thinking")
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort

    const talkStream = client.createTalkMessageStream()
    let full = ""

    try {
      full = await streamChat(
        history,
        async (chunk) => {
          if (!talkStream.isActive()) return
          await talkStream.streamMessageChunk(chunk, false)
        },
        abort.signal
      )
      if (talkStream.isActive()) {
        await talkStream.endMessage()
      }
      if (full.trim()) {
        pushTurns([...history, { role: "assistant", content: full.trim() }])
      }
      setPhase("speaking")
    } catch (err) {
      if (abort.signal.aborted) return
      try {
        if (talkStream.isActive()) await talkStream.endMessage()
      } catch {
        /* ignore */
      }
      const msg =
        err instanceof Error ? err.message : "Не удалось получить ответ"
      setError(msg)
      try {
        await client.talk(
          "Извини, сбой на стороне мозга. Повтори вопрос, пожалуйста."
        )
      } catch {
        /* ignore */
      }
      setPhase("error")
    } finally {
      busyRef.current = false
    }
  }, [pushTurns])

  const stop = useCallback(async () => {
    abortRef.current?.abort()
    const client = clientRef.current
    clientRef.current = null
    setConnected(false)
    setPhase("idle")
    if (!client) return
    try {
      await client.stopStreaming()
    } catch {
      /* ignore */
    }
  }, [])

  const start = useCallback(async () => {
    await stop()
    setError(null)
    setPhase("connecting")
    try {
      const sessionToken = await fetchAnamSessionToken()
      const client = createClient(sessionToken)

      client.addListener(AnamEvent.SESSION_READY, () => {
        setConnected(true)
        setPhase(micEnabled ? "listening" : "ready")
        if (!micEnabled) {
          try {
            client.muteInputAudio()
          } catch {
            /* ignore */
          }
        }
      })

      client.addListener(AnamEvent.CONNECTION_CLOSED, () => {
        setConnected(false)
        setPhase("idle")
      })

      client.addListener(AnamEvent.USER_SPEECH_STARTED, () => {
        setPhase("listening")
      })

      client.addListener(AnamEvent.TALK_STREAM_INTERRUPTED, () => {
        abortRef.current?.abort()
      })

      client.addListener(AnamEvent.MESSAGE_HISTORY_UPDATED, (messages) => {
        const mapped: ChatMessage[] = (messages || [])
          .filter((m) => m?.content && (m.role === "user" || m.role === "persona" || m.role === "assistant"))
          .map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: String(m.content),
          }))
        pushTurns(mapped)
        void respondToHistory(mapped)
      })

      clientRef.current = client
      // https://anam.ai/docs/javascript-sdk/reference/audio-control
      if (!micEnabled) {
        try {
          client.muteInputAudio()
        } catch {
          /* ignore */
        }
      }
      await client.streamToVideoElement(videoElementId)
      setConnected(true)
      setPhase(micEnabled ? "listening" : "ready")
    } catch (err) {
      setConnected(false)
      setPhase("error")
      setError(err instanceof Error ? err.message : "Anam connect failed")
    }
  }, [micEnabled, pushTurns, respondToHistory, stop, videoElementId])

  useEffect(() => {
    if (!enabled) {
      void stop()
      return
    }
    void start()
    return () => {
      void stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reconnect only when enabled flips
  }, [enabled])

  useEffect(() => {
    const client = clientRef.current
    if (!client?.isStreaming()) return
    try {
      if (micEnabled) {
        client.unmuteInputAudio()
        setPhase((p) => (p === "ready" || p === "idle" ? "listening" : p))
      } else {
        client.muteInputAudio()
        setPhase((p) => (p === "listening" ? "ready" : p))
      }
    } catch {
      /* ignore */
    }
  }, [micEnabled])

  const askText = useCallback(
    async (text: string) => {
      const cleaned = text.trim()
      if (!cleaned) return
      const client = clientRef.current
      if (!client?.isStreaming()) {
        setError("Сначала включи video mode")
        return
      }

      const history = [
        ...turnsRef.current,
        { role: "user" as const, content: cleaned },
      ]
      pushTurns(history)
      // Text path: свой brain → talk stream (не Anam LLM)
      lastUserRef.current = ""
      await respondToHistory(history)
    },
    [pushTurns, respondToHistory]
  )

  return {
    phase,
    error,
    connected,
    askText,
    restart: start,
    stop,
  }
}
