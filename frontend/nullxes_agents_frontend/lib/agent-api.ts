export type AnamPersonaPreview = {
  id: string
  name: string
  description: string
  imageUrl: string
  landscapeImageUrl: string
  portraitImageUrl: string
  idleVideoUrl: string
  videoUrl: string
  avatarId: string
}

export type ChatMessage = { role: "user" | "assistant"; content: string }

export async function fetchAnamPersona(): Promise<AnamPersonaPreview> {
  const res = await fetch("/api/anam/persona", { cache: "no-store" })
  const data = await res.json()
  if (!res.ok || !data.ok || !data.persona) {
    throw new Error(data.error || `persona ${res.status}`)
  }
  return data.persona as AnamPersonaPreview
}

export async function fetchAnamSessionToken(): Promise<string> {
  const res = await fetch("/api/anam/session-token", { method: "POST" })
  const data = await res.json()
  if (!res.ok || !data.ok || !data.sessionToken) {
    throw new Error(data.error || `session-token ${res.status}`)
  }
  return data.sessionToken as string
}

/** Stream LLM chunks (NDJSON lines `{ content }`) into a callback. */
export async function streamChat(
  messages: ChatMessage[],
  onChunk: (text: string) => void | Promise<void>,
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch("/api/chat-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `chat-stream ${res.status}`)
  }
  const reader = res.body?.getReader()
  if (!reader) throw new Error("no stream body")

  const decoder = new TextDecoder()
  let full = ""
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const data = JSON.parse(trimmed) as { content?: string }
        if (data.content) {
          full += data.content
          await onChunk(data.content)
        }
      } catch {
        /* ignore partial JSON */
      }
    }
  }
  return full
}
