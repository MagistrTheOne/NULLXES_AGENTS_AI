"use client"

import { useEffect, useId, useState } from "react"
import {
  ArrowUp,
  Eraser,
  MessageSquare,
  Mic,
  MoreHorizontal,
  RotateCcw,
  Square,
  Video,
} from "lucide-react"

import { AnnaChatPanel } from "@/components/anna/anna-chat-panel"
import { AnnaStage } from "@/components/anna/anna-stage"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAnamSession, type SessionPhase } from "@/hooks/use-anam-session"
import type { ChatMessage } from "@/lib/agent-api"
import {
  getConversation,
  newConversationId,
  upsertConversation,
} from "@/lib/conversations"
import { cn } from "@/lib/utils"

const VIDEO_ID = "anna-live-video"
const ACTIVE_KEY = "nullxes.activeConversationId"

function phaseLabel(phase: SessionPhase, sessionOn: boolean, micOn: boolean) {
  if (!sessionOn) return "Idle"
  if (phase === "connecting") return "Connecting"
  if (phase === "listening") return "Listening"
  if (phase === "thinking") return "Thinking"
  if (phase === "speaking") return "Speaking"
  if (phase === "error") return "Error"
  if (phase === "ready") return micOn ? "Available" : "Video · muted"
  if (phase === "idle") return "Idle"
  return "Available"
}

export function AnnaHome() {
  const reactId = useId()
  const [conversationId, setConversationId] = useState("")
  const [query, setQuery] = useState("")
  const [asking, setAsking] = useState(false)
  const [sessionOn, setSessionOn] = useState(false)
  const [micOn, setMicOn] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [turns, setTurns] = useState<ChatMessage[]>([])

  const {
    phase,
    error,
    connected,
    askText,
    restart,
    stop,
    clearHistory,
    interrupt,
    loadHistory,
  } = useAnamSession({
    videoElementId: VIDEO_ID,
    enabled: sessionOn,
    micEnabled: micOn,
    onTurns: setTurns,
  })

  // restore / create conversation id
  useEffect(() => {
    const fromUrl =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("c")
        : null
    const stored =
      typeof window !== "undefined" ? localStorage.getItem(ACTIVE_KEY) : null
    const id = fromUrl || stored || newConversationId()
    setConversationId(id)
    localStorage.setItem(ACTIVE_KEY, id)
    const existing = getConversation(id)
    if (existing?.messages?.length) {
      setTurns(existing.messages)
      loadHistory(existing.messages)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reactId])

  // persist turns → Conversations
  useEffect(() => {
    if (!conversationId || turns.length === 0) return
    upsertConversation(conversationId, turns)
    localStorage.setItem(ACTIVE_KEY, conversationId)
  }, [conversationId, turns])

  const label = phaseLabel(phase, sessionOn, micOn)
  const online =
    sessionOn && connected && phase !== "error" && phase !== "connecting"
  const connecting = sessionOn && phase === "connecting"

  const startSession = () => setSessionOn(true)

  const stopSession = async () => {
    setMicOn(false)
    setSessionOn(false)
    await stop()
  }

  const onAsk = async (text?: string) => {
    const value = (text ?? query).trim()
    if (!value || asking) return
    setAsking(true)
    if (!text) setQuery("")
    setChatOpen(true)
    try {
      await askText(value)
    } finally {
      setAsking(false)
    }
  }

  const onNewChat = () => {
    interrupt()
    clearHistory()
    const id = newConversationId()
    setConversationId(id)
    localStorage.setItem(ACTIVE_KEY, id)
    setChatOpen(true)
  }

  return (
    <TooltipProvider>
      <div className="relative flex h-full min-h-0 flex-col bg-black text-white">
        <header className="flex shrink-0 items-start justify-between gap-3 px-4 pt-4 sm:px-6 md:px-8">
          <div className="min-w-0">
            <h1 className="font-heading text-3xl font-medium tracking-tight text-white sm:text-4xl md:text-5xl">
              Anna Maria
            </h1>
            <p className="mt-1 text-sm text-white/45">Digital Executive</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  online
                    ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]"
                    : connecting
                      ? "bg-amber-400"
                      : "bg-white/35"
                )}
              />
              <Badge
                variant="secondary"
                className="normal-case tracking-normal text-white/55"
              >
                {label}
              </Badge>
              <Badge
                variant="secondary"
                className="normal-case tracking-normal text-white/35"
              >
                ElevenLabs · zEDqu…
              </Badge>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-lg bg-white/5 text-white hover:bg-white/10"
            onClick={() => setChatOpen(true)}
          >
            <MessageSquare className="size-3.5" />
            Chat
          </Button>
        </header>

        <main className="mx-auto flex w-full min-h-0 max-w-5xl flex-1 flex-col px-4 pb-28 pt-4 sm:px-6 md:px-8 md:pb-32">
          <AnnaStage
            videoElementId={VIDEO_ID}
            live={sessionOn && connected}
            className="mx-auto aspect-video w-full max-h-[min(58dvh,640px)] max-w-4xl shadow-[0_40px_120px_rgba(0,0,0,0.55)] sm:aspect-16/10"
          />

          {error ? (
            <div className="mx-auto mt-4 w-full max-w-4xl rounded-xl border border-amber-400/20 bg-amber-400/8 px-4 py-3 text-sm text-amber-100/90">
              {error}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="rounded-lg bg-white/10 text-white hover:bg-white/15"
                  onClick={() => void stopSession()}
                >
                  Stop
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="rounded-lg bg-white text-black hover:bg-white/90"
                  onClick={() => {
                    void (async () => {
                      await stopSession()
                      setTimeout(() => setSessionOn(true), 800)
                    })()
                  }}
                >
                  Retry Start
                </Button>
              </div>
            </div>
          ) : null}
        </main>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-5">
          <div className="pointer-events-auto mx-auto flex w-full max-w-3xl flex-wrap items-center gap-2 rounded-2xl bg-zinc-900/95 p-2 ring-1 ring-white/10 backdrop-blur-md sm:flex-nowrap sm:gap-2.5 sm:p-2.5">
            <Button
              type="button"
              variant="secondary"
              className={cn(
                "h-11 shrink-0 rounded-full px-4 text-xs font-medium tracking-wide normal-case",
                sessionOn
                  ? "bg-red-500/20 text-red-200 hover:bg-red-500/30"
                  : "bg-white text-black hover:bg-white/90"
              )}
              disabled={connecting}
              onClick={() => {
                if (sessionOn) void stopSession()
                else startSession()
              }}
            >
              {sessionOn ? (
                <>
                  <Square className="size-3.5 fill-current" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Video className="size-3.5" />
                  <span>Start</span>
                </>
              )}
            </Button>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    disabled={!sessionOn || !connected}
                    className={cn(
                      "size-11 shrink-0 rounded-full bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-40",
                      micOn && "ring-2 ring-emerald-400/50"
                    )}
                    onClick={() => setMicOn((v) => !v)}
                    aria-label="Toggle microphone"
                  />
                }
              >
                <Mic className="size-4" />
              </TooltipTrigger>
              <TooltipContent>
                {micOn ? "Mute mic (Anam STT)" : "Unmute mic (Anam STT · ru)"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className={cn(
                      "size-11 shrink-0 rounded-full bg-zinc-800 text-white hover:bg-zinc-700",
                      chatOpen && "ring-2 ring-white/30"
                    )}
                    onClick={() => setChatOpen(true)}
                    aria-label="Open chat"
                  />
                }
              >
                <MessageSquare className="size-4" />
              </TooltipTrigger>
              <TooltipContent>Чат → Anam</TooltipContent>
            </Tooltip>

            <form
              className="order-last flex min-w-0 basis-full items-center gap-2 rounded-full bg-zinc-800/90 px-3 py-1 ring-1 ring-white/5 sm:order-0 sm:basis-auto sm:flex-1 sm:px-4 [&_input::placeholder]:text-white/35"
              onSubmit={(e) => {
                e.preventDefault()
                void onAsk()
              }}
            >
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask Anna…"
                className="h-10 min-w-0 border-0 border-b-0 bg-transparent text-sm text-white focus-visible:ring-0"
                disabled={asking || !sessionOn || !connected}
              />
              <Button
                type="submit"
                size="icon"
                variant="secondary"
                disabled={asking || !query.trim() || !sessionOn || !connected}
                className="size-9 shrink-0 rounded-full bg-zinc-700 text-white hover:bg-zinc-600"
                aria-label="Send"
              >
                <ArrowUp className="size-4" />
              </Button>
            </form>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="size-11 shrink-0 rounded-full bg-zinc-800 text-white hover:bg-zinc-700"
                    aria-label="More"
                  />
                }
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    disabled={!sessionOn || !connected}
                    onClick={() => void restart()}
                  >
                    <RotateCcw className="size-3.5" />
                    Reconnect
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={
                      !sessionOn ||
                      (phase !== "thinking" && phase !== "speaking")
                    }
                    onClick={() => interrupt()}
                  >
                    <Square className="size-3.5" />
                    Interrupt
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setChatOpen(true)}>
                    <MessageSquare className="size-3.5" />
                    Open chat
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onNewChat}>
                    <Eraser className="size-3.5" />
                    New chat
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    disabled={!sessionOn}
                    onClick={() => void stopSession()}
                  >
                    Stop session
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Sheet open={chatOpen} onOpenChange={setChatOpen}>
          <SheetContent
            side="right"
            className="flex w-full flex-col border-white/10 bg-black text-white sm:max-w-md"
          >
            <SheetHeader>
              <SheetTitle className="text-white">Anna · live chat</SheetTitle>
            </SheetHeader>
            <AnnaChatPanel
              className="mt-4 min-h-0 flex-1"
              turns={turns}
              phase={phase}
              connected={connected}
              sessionOn={sessionOn}
              onSend={(text) => onAsk(text)}
            />
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  )
}
