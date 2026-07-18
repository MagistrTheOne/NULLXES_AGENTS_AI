"use client"

import { useMemo, useState } from "react"
import {
  ArrowUp,
  MessageSquare,
  Mic,
  MoreHorizontal,
  Video,
} from "lucide-react"

import { AnnaStage } from "@/components/anna/anna-stage"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
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
import { useSession } from "@/lib/auth-client"
import type { ChatMessage } from "@/lib/agent-api"
import { cn } from "@/lib/utils"

const VIDEO_ID = "anna-live-video"

function phaseLabel(phase: SessionPhase, videoOn: boolean, micOn: boolean) {
  if (!videoOn) return "Preview"
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
  const { data: session } = useSession()
  const userName = session?.user?.name?.trim() || ""

  const [query, setQuery] = useState("")
  const [asking, setAsking] = useState(false)
  const [videoOn, setVideoOn] = useState(true)
  const [micOn, setMicOn] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [turns, setTurns] = useState<ChatMessage[]>([])

  const { phase, error, connected, askText, restart } = useAnamSession({
    videoElementId: VIDEO_ID,
    enabled: videoOn,
    micEnabled: micOn,
    onTurns: setTurns,
  })

  const label = phaseLabel(phase, videoOn, micOn)
  const online =
    videoOn && connected && phase !== "error" && phase !== "connecting"

  const detailLine = useMemo(() => {
    if (error) return error
    if (!videoOn) return "Preview · включи video для live + chat"
    if (phase === "connecting") return "Подключение NULLXES…"
    if (micOn) return "Говори в микрофон — ответ через brain NULLXES"
    if (userName) return `${userName} · пиши в чат или включи mic`
    return "Пиши в чат или включи mic"
  }, [error, videoOn, phase, micOn, userName])

  const onAsk = async () => {
    const text = query.trim()
    if (!text || asking) return
    setAsking(true)
    setQuery("")
    setChatOpen(true)
    try {
      await askText(text)
    } finally {
      setAsking(false)
    }
  }

  return (
    <TooltipProvider>
      <div className="relative flex min-h-dvh flex-col bg-black text-white">
        <header className="flex items-center justify-end gap-4 px-6 pt-5 md:px-10">
          <p className="max-w-[70vw] truncate text-right text-[11px] text-white/35">
            {detailLine}
          </p>
        </header>

        <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-36 pt-6 md:px-8 md:pt-10">
          <div className="pointer-events-none absolute left-4 top-[28%] z-10 max-w-48 md:left-10 md:top-[32%]">
            <h1 className="font-heading text-4xl font-medium tracking-tight text-white md:text-5xl">
              Anna Maria
            </h1>
            <p className="mt-2 text-sm text-white/45">Digital Executive</p>
            <div className="mt-4 flex items-center gap-2">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  online
                    ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]"
                    : phase === "connecting"
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
            </div>
          </div>

          <AnnaStage
            videoElementId={VIDEO_ID}
            live={videoOn && connected}
            className="mx-auto aspect-16/10 w-full max-w-4xl shadow-[0_40px_120px_rgba(0,0,0,0.55)] md:mt-4"
          />
        </main>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-5 md:pb-8">
          <div className="pointer-events-auto flex w-full max-w-3xl items-center gap-2 rounded-2xl bg-zinc-900/90 p-2 ring-1 ring-white/10 backdrop-blur-md md:gap-3 md:p-2.5">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className={cn(
                      "size-11 shrink-0 rounded-full bg-zinc-800 text-white hover:bg-zinc-700",
                      micOn && "ring-2 ring-emerald-400/50"
                    )}
                    onClick={() => {
                      if (!videoOn) setVideoOn(true)
                      setMicOn((v) => !v)
                    }}
                    aria-label="Toggle microphone"
                  />
                }
              >
                <Mic className="size-4" />
              </TooltipTrigger>
              <TooltipContent>
                {micOn ? "Mute mic" : "Unmute mic"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="size-11 shrink-0 rounded-full bg-zinc-800 text-white hover:bg-zinc-700"
                    onClick={() => setChatOpen(true)}
                    aria-label="Open chat"
                  />
                }
              >
                <MessageSquare className="size-4" />
              </TooltipTrigger>
              <TooltipContent>Чат</TooltipContent>
            </Tooltip>

            <form
              className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-zinc-800/90 px-4 py-1 ring-1 ring-white/5 [&_input::placeholder]:text-white/35"
              onSubmit={(e) => {
                e.preventDefault()
                void onAsk()
              }}
            >
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  userName
                    ? `Ask Anna, ${userName.split(" ")[0]}…`
                    : "Ask Anna anything…"
                }
                className="h-10 border-0 border-b-0 bg-transparent text-sm text-white focus-visible:ring-0"
                disabled={asking || !videoOn}
              />
              <Button
                type="submit"
                size="icon"
                variant="secondary"
                disabled={asking || !query.trim() || !videoOn}
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
              <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuItem onClick={() => void restart()}>
                  Reconnect
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setChatOpen(true)}>
                  Open chat
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setMicOn(false)
                    setVideoOn(false)
                  }}
                >
                  Stop session
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className={cn(
                      "size-11 shrink-0 rounded-full bg-zinc-800 text-white hover:bg-zinc-700",
                      videoOn && "ring-2 ring-white/40"
                    )}
                    onClick={() => {
                      setVideoOn((v) => {
                        if (v) setMicOn(false)
                        return !v
                      })
                    }}
                    aria-label="Toggle video mode"
                  />
                }
              >
                <Video className="size-4" />
              </TooltipTrigger>
              <TooltipContent>
                {videoOn ? "Stop live" : "Start live"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <Sheet open={chatOpen} onOpenChange={setChatOpen}>
          <SheetContent
            side="right"
            className="border-white/10 bg-zinc-950 text-white sm:max-w-md"
          >
            <SheetHeader>
              <SheetTitle className="text-white">Anna · chat</SheetTitle>
            </SheetHeader>
            <div className="mt-4 flex flex-1 flex-col gap-3 overflow-y-auto pb-6">
              {turns.length === 0 ? (
                <p className="text-sm text-white/40">
                  Video on → спроси текстом или включи mic. Ответ озвучивается с
                  lip-sync.
                </p>
              ) : (
                turns.map((t, i) => (
                  <div
                    key={`${t.role}-${i}-${t.content.slice(0, 12)}`}
                    className={cn(
                      "max-w-[90%] rounded-2xl px-3 py-2 text-sm",
                      t.role === "user"
                        ? "ml-auto bg-white/10"
                        : "bg-zinc-900 ring-1 ring-white/10"
                    )}
                  >
                    {t.content}
                  </div>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  )
}
