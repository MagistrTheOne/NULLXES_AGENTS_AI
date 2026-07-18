from __future__ import annotations

import json
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path

_LIVE = Path(__file__).resolve().parent / "data" / "live_status.json"


@dataclass
class AgentStatus:
    state: str = "starting"
    mic_ok: bool | None = None
    mic_device: str = ""
    mic_level: float = 0.0
    heard: str = ""
    command: str = ""
    reply: str = ""
    detail: str = ""
    session_open: bool = False
    updated_at: float = 0.0
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def update(self, **kwargs) -> None:
        with self._lock:
            for k, v in kwargs.items():
                if hasattr(self, k) and k != "_lock":
                    setattr(self, k, v)
            self.updated_at = time.time()
            self._persist()

    def snapshot(self) -> dict:
        # всегда подтягиваем с диска — bridge и main в разных процессах
        disk = _read_disk()
        with self._lock:
            if disk and disk.get("updated_at", 0) >= self.updated_at:
                for k, v in disk.items():
                    if hasattr(self, k) and k != "_lock":
                        setattr(self, k, v)
            return {
                "state": self.state,
                "mic_ok": self.mic_ok,
                "mic_device": self.mic_device,
                "mic_level": self.mic_level,
                "heard": self.heard,
                "command": self.command,
                "reply": self.reply,
                "detail": self.detail,
                "session_open": self.session_open,
                "updated_at": self.updated_at,
            }

    def _persist(self) -> None:
        try:
            _LIVE.parent.mkdir(parents=True, exist_ok=True)
            payload = {
                "state": self.state,
                "mic_ok": self.mic_ok,
                "mic_device": self.mic_device,
                "mic_level": self.mic_level,
                "heard": self.heard,
                "command": self.command,
                "reply": self.reply,
                "detail": self.detail,
                "session_open": self.session_open,
                "updated_at": self.updated_at,
            }
            _LIVE.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        except Exception:
            pass


def _read_disk() -> dict | None:
    try:
        if not _LIVE.exists():
            return None
        return json.loads(_LIVE.read_text(encoding="utf-8"))
    except Exception:
        return None


STATUS = AgentStatus()
# подтянуть прошлое состояние
_disk = _read_disk()
if _disk:
    for _k, _v in _disk.items():
        if hasattr(STATUS, _k) and _k != "_lock":
            setattr(STATUS, _k, _v)

STATE_LABELS = {
    "starting": "Запуск…",
    "mic_check": "Проверка микрофона…",
    "idle": "Ждёт «Анна»",
    "wake": "Услышала!",
    "listen": "Слушает…",
    "think": "Думает…",
    "speak": "Говорит…",
    "error": "Ошибка",
}
