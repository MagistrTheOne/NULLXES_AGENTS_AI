import OpenAI from "openai"
import { headers } from "next/headers"

import { buildSystemPrompt, resolveLlm, type ChatMessage } from "@/lib/anna-brain"
import { auth } from "@/lib/auth"

export const runtime = "nodejs"

type Body = {
  messages?: ChatMessage[]
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const llm = resolveLlm()
  if (!llm.apiKey) {
    return new Response(JSON.stringify({ error: "LLM API key missing" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  let body: Body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const messages = (body.messages || [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
    .map((m) => ({ role: m.role, content: m.content }))

  const client = new OpenAI({
    apiKey: llm.apiKey,
    baseURL: llm.baseURL,
  })

  const system = buildSystemPrompt({
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  })

  try {
    const stream = await client.chat.completions.create({
      model: llm.model,
      stream: true,
      temperature: 0.7,
      messages: [
        { role: "system", content: system },
        ...messages,
      ],
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ""
            if (content) {
              controller.enqueue(
                encoder.encode(JSON.stringify({ content }) + "\n")
              )
            }
          }
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "chat-stream failed"
    return new Response(JSON.stringify({ error: message, provider: llm.provider }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
