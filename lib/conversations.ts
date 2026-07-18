import type { ChatMessage } from "@/lib/agent-api"

export type Conversation = {
  id: string
  title: string
  updatedAt: number
  messages: ChatMessage[]
}

const KEY = "nullxes.conversations.v1"

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage
}

export function listConversations(): Conversation[] {
  if (!canUseStorage()) return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Conversation[]
    if (!Array.isArray(parsed)) return []
    return parsed.sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

function saveAll(items: Conversation[]) {
  if (!canUseStorage()) return
  localStorage.setItem(KEY, JSON.stringify(items))
}

export function getConversation(id: string): Conversation | null {
  return listConversations().find((c) => c.id === id) || null
}

export function upsertConversation(
  id: string,
  messages: ChatMessage[],
  titleHint?: string
): Conversation {
  const items = listConversations()
  const existing = items.find((c) => c.id === id)
  const firstUser = messages.find((m) => m.role === "user")?.content?.trim()
  const title =
    titleHint ||
    existing?.title ||
    (firstUser ? firstUser.slice(0, 48) : "Новый диалог")

  const next: Conversation = {
    id,
    title,
    updatedAt: Date.now(),
    messages,
  }

  const rest = items.filter((c) => c.id !== id)
  saveAll([next, ...rest])
  return next
}

export function deleteConversation(id: string) {
  saveAll(listConversations().filter((c) => c.id !== id))
}

export function newConversationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `c_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function formatWhen(ts: number) {
  const d = new Date(ts)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) {
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
  }
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })
}
