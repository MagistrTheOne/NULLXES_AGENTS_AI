"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { MessageSquare, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  deleteConversation,
  formatWhen,
  listConversations,
  type Conversation,
} from "@/lib/conversations"
import { cn } from "@/lib/utils"

export default function ConversationsPage() {
  const [items, setItems] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  const refresh = () => setItems(listConversations())

  useEffect(() => {
    refresh()
    const onStorage = () => refresh()
    window.addEventListener("storage", onStorage)
    window.addEventListener("focus", refresh)
    return () => {
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("focus", refresh)
    }
  }, [])

  const active = useMemo(
    () => items.find((c) => c.id === activeId) || items[0] || null,
    [items, activeId]
  )

  useEffect(() => {
    if (!activeId && items[0]) setActiveId(items[0].id)
  }, [items, activeId])

  return (
    <main className="flex min-h-dvh">
      <aside className="flex w-full max-w-sm flex-col border-r border-white/10 bg-black">
        <div className="border-b border-white/5 px-5 py-5">
          <p className="text-[11px] font-medium tracking-[0.35em] text-white/50">
            CONVERSATIONS
          </p>
          <h1 className="mt-2 font-heading text-2xl text-white">История</h1>
          <p className="mt-1 text-sm text-white/40">
            Реальные диалоги с Анной (локально)
          </p>
        </div>
        <ul className="flex-1 overflow-y-auto p-2">
          {items.length === 0 ? (
            <li className="px-3 py-6 text-sm text-white/40">
              Пока пусто. Открой Overview → Start → напиши в чат.
            </li>
          ) : (
            items.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className={cn(
                    "flex w-full flex-col gap-1 rounded-xl px-3 py-3 text-left hover:bg-white/5",
                    active?.id === c.id && "bg-white/10"
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm text-white/90">
                      {c.title}
                    </span>
                    <span className="shrink-0 text-[11px] text-white/35">
                      {formatWhen(c.updatedAt)}
                    </span>
                  </div>
                  <span className="truncate text-xs text-white/40">
                    {c.messages[c.messages.length - 1]?.content || "—"}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        {!active ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8">
            <MessageSquare className="mb-3 size-6 text-white/30" />
            <p className="font-heading text-2xl text-white/80">Нет диалогов</p>
            <Link
              href="/"
              className="mt-6 inline-flex h-10 items-center rounded-xl bg-white px-6 text-xs font-semibold tracking-widest text-black uppercase hover:bg-white/90"
            >
              К Анне
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-white/5 px-5 py-4">
              <div className="min-w-0">
                <h2 className="truncate font-heading text-xl text-white">
                  {active.title}
                </h2>
                <p className="text-xs text-white/40">
                  {active.messages.length} сообщений · {formatWhen(active.updatedAt)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-lg bg-white/5 text-white hover:bg-white/10"
                  onClick={() => {
                    deleteConversation(active.id)
                    setActiveId(null)
                    refresh()
                  }}
                >
                  <Trash2 className="size-3.5" />
                  Удалить
                </Button>
                <Link
                  href={`/?c=${active.id}`}
                  className="inline-flex h-9 items-center rounded-lg bg-white px-4 text-xs font-semibold tracking-widest text-black uppercase hover:bg-white/90"
                >
                  Продолжить
                </Link>
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
              {active.messages.map((m, i) => (
                <div
                  key={`${m.role}-${i}-${m.content.slice(0, 16)}`}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    m.role === "user"
                      ? "ml-auto bg-white/10"
                      : "bg-zinc-900 ring-1 ring-white/10"
                  )}
                >
                  {m.content}
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  )
}
