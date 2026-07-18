"""HTTP/WS bridge для Next.js UI. Запуск: python agent/bridge.py"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

from config import ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, LLM_PROVIDER
from status import STATUS
from studio_store import (
    append_session_event,
    ensure_dirs,
    knowledge_context,
    list_knowledge,
    load_settings,
    recent_sessions,
    save_knowledge_file,
    save_settings,
)

ensure_dirs()

app = FastAPI(title="Anna Agent Bridge")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _snapshot() -> dict:
    snap = STATUS.snapshot()
    state = snap.get("state", "idle")
    available = state in {"idle", "listen"} and not STATUS.session_open
    return {
        **snap,
        "available": available or state == "idle",
        "session_open": STATUS.session_open,
        "llm_provider": load_settings().get("llm_provider") or LLM_PROVIDER,
    }


@app.get("/health")
def health():
    return {"ok": True, "service": "anna-bridge"}


@app.get("/status")
def status():
    return _snapshot()


@app.websocket("/ws/status")
async def ws_status(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            await ws.send_json(_snapshot())
            await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        return


class StartBody(BaseModel):
    note: str | None = None


@app.post("/session/start")
def session_start(_: StartBody | None = None):
    STATUS.update(
        state="idle",
        detail="UI: скажи «Салам Анна» у микрофона ПК",
        command="",
        reply="",
    )
    STATUS.session_open = False
    append_session_event({"type": "ui_talk_clicked", "channel": "desktop"})
    return {
        "ok": True,
        "detail": "Жду wake на ПК. Запусти python agent/main.py если ещё не запущен.",
    }


@app.post("/voice/preview")
def voice_preview():
    if not ELEVENLABS_API_KEY:
        return Response(status_code=400, content=b"no elevenlabs key")
    from elevenlabs import ElevenLabs

    client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
    audio = client.text_to_speech.convert(
        text="Салам. Я Анна Мария Наллксес, Digital Executive NULLXES.",
        voice_id=ELEVENLABS_VOICE_ID,
        model_id="eleven_multilingual_v2",
        output_format="mp3_44100_128",
    )
    if hasattr(audio, "__iter__") and not isinstance(audio, (bytes, bytearray)):
        data = b"".join(chunk for chunk in audio)
    else:
        data = bytes(audio)
    return Response(content=data, media_type="audio/mpeg")


@app.get("/studio/settings")
def get_settings():
    return load_settings()


class SettingsBody(BaseModel):
    llm_provider: str | None = None
    system_prompt: str | None = None
    phone: dict | None = None


@app.post("/studio/settings")
def post_settings(body: SettingsBody):
    cur = load_settings()
    if body.llm_provider is not None:
        cur["llm_provider"] = body.llm_provider.strip().lower()
    if body.system_prompt is not None:
        cur["system_prompt"] = body.system_prompt
    if body.phone is not None:
        phone = cur.get("phone") or {}
        phone.update(body.phone)
        cur["phone"] = phone
    return save_settings(cur)


@app.get("/studio/knowledge")
def get_knowledge():
    return {"files": list_knowledge(), "preview": knowledge_context(2000)}


@app.post("/studio/knowledge")
async def upload_knowledge(file: UploadFile = File(...)):
    raw = await file.read()
    name = save_knowledge_file(file.filename or "note.md", raw)
    append_session_event({"type": "kb_upload", "name": name})
    return {"ok": True, "name": name, "files": list_knowledge()}


class KbTextBody(BaseModel):
    name: str = "note.md"
    content: str


@app.post("/studio/knowledge/text")
def post_knowledge_text(body: KbTextBody):
    name = save_knowledge_file(body.name, body.content)
    return {"ok": True, "name": name, "files": list_knowledge()}


@app.get("/studio/sessions")
def get_sessions(limit: int = 40):
    return {"events": recent_sessions(limit)}


@app.get("/studio/phone")
def get_phone():
    from phone_channel import phone_bootstrap_payload

    s = load_settings()
    return {
        "phone": s.get("phone"),
        "voice_id": ELEVENLABS_VOICE_ID,
        "bootstrap": phone_bootstrap_payload(),
        "architecture": {
            "desktop": "agent/main.py + Anam + ElevenLabs TTS",
            "inbound": "ElevenLabs Agents / Reception path — same prompt + KB + voice",
            "docs": "https://elevenlabs.io/docs/reception-ai/overview",
        },
    }


class PhoneBody(BaseModel):
    enabled: bool | None = None
    phone_number: str | None = None
    elevenlabs_agent_id: str | None = None
    notes: str | None = None


@app.post("/studio/phone")
def post_phone(body: PhoneBody):
    cur = load_settings()
    phone = cur.get("phone") or {}
    if body.enabled is not None:
        phone["enabled"] = body.enabled
    if body.phone_number is not None:
        phone["phone_number"] = body.phone_number
    if body.elevenlabs_agent_id is not None:
        phone["elevenlabs_agent_id"] = body.elevenlabs_agent_id
    if body.notes is not None:
        phone["notes"] = body.notes
    cur["phone"] = phone
    save_settings(cur)
    append_session_event({"type": "phone_config", "phone": phone})
    return {"ok": True, "phone": phone}


if __name__ == "__main__":
    import uvicorn

    print("Anna bridge → http://127.0.0.1:8787")
    print("Next UI → npm run dev в web/")
    uvicorn.run(app, host="127.0.0.1", port=8787, log_level="info")
