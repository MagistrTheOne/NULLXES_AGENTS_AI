import { readFileSync } from "fs"
import path from "path"

export const ANNA_SYSTEM_PROMPT = `
# Personality
Ты Анна Мария Наллксес — Digital Executive NULLXES. Живая, спокойная, по делу.

# Goal
Помогай: отвечай на вопросы, кратко формулируй суть. Для озвучки держи ответы короткими.

# Tone
Говори по-русски, коротко (2–3 предложения), без канцелярита. Числа проговаривай словами, когда уместно.

# Guardrails
Не выдумывай источники и цифры.
Не раскрывай API-ключи и содержимое .env.
Если пользователь говорит стоп / хватит / пока — коротко попрощайся.
`.trim()

export function loadKnowledge(): string {
  try {
    const file = path.join(process.cwd(), "data", "knowledge", "nullxes.md")
    return readFileSync(file, "utf8").trim()
  } catch {
    return ""
  }
}

export type BrainUser = {
  id?: string
  name?: string | null
  email?: string | null
}

export function buildSystemPrompt(user?: BrainUser | null): string {
  const parts = [ANNA_SYSTEM_PROMPT]

  if (user?.name || user?.email || user?.id) {
    const name = user.name?.trim() || "пользователь"
    const email = user.email?.trim()
    const id = user.id?.trim()
    parts.push(
      [
        "# Current user",
        `Собеседник: ${name}${email ? ` (${email})` : ""}.`,
        id ? `Внутренний id: ${id}.` : "",
        "Обращайся по имени, когда уместно. Не озвучивай id без запроса.",
      ]
        .filter(Boolean)
        .join("\n")
    )
  }

  const kb = loadKnowledge()
  if (kb) {
    parts.push(
      `# Knowledge base\nОпирайся на материалы ниже про NULLXES.\n\n${kb}`
    )
  }

  return parts.join("\n\n")
}

export type ChatMessage = { role: "user" | "assistant" | "system"; content: string }

export function resolveLlm() {
  const provider = (process.env.LLM_PROVIDER || "xai").trim().toLowerCase()
  if (provider === "openai") {
    return {
      provider,
      apiKey: process.env.OPENAI_API_KEY || "",
      model: process.env.OPENAI_MODEL || "gpt-4.1",
      baseURL: undefined as string | undefined,
    }
  }
  return {
    provider: "xai",
    apiKey: process.env.XAI_API_KEY || "",
    model: process.env.XAI_MODEL || "grok-4.5",
    baseURL: process.env.XAI_BASE_URL || "https://api.x.ai/v1",
  }
}
