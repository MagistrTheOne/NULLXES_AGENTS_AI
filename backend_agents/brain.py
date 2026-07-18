from __future__ import annotations

from openai import OpenAI

from config import (
    LLM_PROVIDER,
    OPENAI_API_KEY,
    OPENAI_MODEL,
    SYSTEM_PROMPT,
    XAI_API_KEY,
    XAI_BASE_URL,
    XAI_MODEL,
)
from studio_store import knowledge_context, load_settings


def _resolve_provider() -> tuple[OpenAI, str, str]:
    settings = load_settings()
    provider = (settings.get("llm_provider") or LLM_PROVIDER or "xai").strip().lower()
    if provider == "openai":
        return OpenAI(api_key=OPENAI_API_KEY), OPENAI_MODEL, provider
    return OpenAI(api_key=XAI_API_KEY, base_url=XAI_BASE_URL), XAI_MODEL, provider


def _system_prompt() -> str:
    settings = load_settings()
    custom = (settings.get("system_prompt") or "").strip()
    base = custom or SYSTEM_PROMPT
    kb = knowledge_context()
    if not kb:
        return base
    return (
        f"{base}\n\n# Knowledge base\n"
        "Опирайся на материалы ниже про NULLXES. Если ответа нет в KB и нужен факт из сети — "
        "используй web_search.\n\n"
        f"{kb}"
    )


def _extract_text(response) -> str:
    text = getattr(response, "output_text", None)
    if text:
        return text.strip()
    parts: list[str] = []
    for item in getattr(response, "output", None) or []:
        for content in getattr(item, "content", None) or []:
            t = getattr(content, "text", None)
            if t:
                parts.append(t)
    if parts:
        return "\n".join(parts).strip()
    choices = getattr(response, "choices", None)
    if choices:
        msg = choices[0].message
        return (msg.content or "").strip()
    return str(response)


def ask(user_text: str) -> str:
    user_text = (user_text or "").strip()
    if not user_text:
        return "Я слушаю. Скажи, что нужно."

    client, model, provider = _resolve_provider()
    system = _system_prompt()
    try:
        response = client.responses.create(
            model=model,
            tools=[{"type": "web_search"}],
            input=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_text},
            ],
        )
        text = _extract_text(response)
        if text:
            return text
    except Exception as exc:
        print(f"[brain] responses failed ({exc}); fallback chat.completions")

    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_text},
            ],
        )
        return (completion.choices[0].message.content or "").strip()
    except Exception as exc:
        return f"Не смогла достучаться до модели ({provider}): {exc}"
