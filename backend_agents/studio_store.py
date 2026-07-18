from __future__ import annotations

import json
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
KB_DIR = DATA / "knowledge"
SESSIONS_PATH = DATA / "sessions.jsonl"
SETTINGS_PATH = DATA / "settings.json"

DEFAULT_SETTINGS = {
    "llm_provider": "xai",
    "system_prompt": "",
    "phone": {
        "enabled": False,
        "provider": "elevenlabs_agents",
        "phone_number": "",
        "elevenlabs_agent_id": "",
        "notes": "Inbound: тот же prompt/voice/KB. Заполни agent_id и номер когда будут.",
    },
}


def ensure_dirs() -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    KB_DIR.mkdir(parents=True, exist_ok=True)
    if not SETTINGS_PATH.exists():
        SETTINGS_PATH.write_text(
            json.dumps(DEFAULT_SETTINGS, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    seed = KB_DIR / "nullxes.md"
    if not seed.exists():
        seed.write_text(
            "# NULLXES\n\n"
            "NULLXES — digital company. Anna Maria Nullxes — Digital Executive.\n"
            "Голосовой ассистент на ПК: wake «Салам Анна», ElevenLabs voice, Anam face.\n"
            "Стек: xAI/OpenAI brain, web search для новостей.\n",
            encoding="utf-8",
        )


def load_settings() -> dict:
    ensure_dirs()
    try:
        data = json.loads(SETTINGS_PATH.read_text(encoding="utf-8"))
    except Exception:
        data = DEFAULT_SETTINGS.copy()
    out = DEFAULT_SETTINGS.copy()
    out.update({k: v for k, v in data.items() if k != "phone"})
    phone = DEFAULT_SETTINGS["phone"].copy()
    if isinstance(data.get("phone"), dict):
        phone.update(data["phone"])
    out["phone"] = phone
    return out


def save_settings(data: dict) -> dict:
    DATA.mkdir(parents=True, exist_ok=True)
    SETTINGS_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return data


def list_knowledge() -> list[dict]:
    ensure_dirs()
    files = []
    for p in sorted(KB_DIR.glob("*")):
        if p.is_file() and p.suffix.lower() in {".md", ".txt", ".pdf"}:
            files.append(
                {
                    "name": p.name,
                    "size": p.stat().st_size,
                    "path": str(p.relative_to(ROOT)),
                }
            )
    return files


def save_knowledge_file(name: str, content: bytes | str) -> str:
    ensure_dirs()
    safe = Path(name).name.replace("..", "")
    if not safe:
        safe = f"note-{int(time.time())}.md"
    path = KB_DIR / safe
    if isinstance(content, str):
        path.write_text(content, encoding="utf-8")
    else:
        path.write_bytes(content)
    return safe


def knowledge_context(limit_chars: int = 6000) -> str:
    ensure_dirs()
    chunks: list[str] = []
    total = 0
    for p in sorted(KB_DIR.glob("*")):
        if p.suffix.lower() not in {".md", ".txt"}:
            continue
        try:
            text = p.read_text(encoding="utf-8")
        except Exception:
            continue
        block = f"## {p.name}\n{text.strip()}\n"
        if total + len(block) > limit_chars:
            block = block[: max(0, limit_chars - total)]
            chunks.append(block)
            break
        chunks.append(block)
        total += len(block)
    return "\n".join(chunks).strip()


def append_session_event(event: dict) -> None:
    ensure_dirs()
    event = {**event, "ts": event.get("ts") or time.time()}
    with SESSIONS_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(event, ensure_ascii=False) + "\n")


def recent_sessions(limit: int = 40) -> list[dict]:
    ensure_dirs()
    if not SESSIONS_PATH.exists():
        return []
    lines = SESSIONS_PATH.read_text(encoding="utf-8").splitlines()
    out: list[dict] = []
    for line in lines[-limit:]:
        try:
            out.append(json.loads(line))
        except Exception:
            continue
    return list(reversed(out))
