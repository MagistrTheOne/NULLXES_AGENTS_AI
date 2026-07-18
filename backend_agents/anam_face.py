from __future__ import annotations

import asyncio
import threading
from typing import Optional

import cv2
import numpy as np
import sounddevice as sd

from config import ANAM_API_KEY, ANAM_PERSONA_ID, ELEVENLABS_API_KEY, ENABLE_ANAM
from status import STATE_LABELS, STATUS


def _draw_hud(img: np.ndarray) -> np.ndarray:
    """Полоска статуса поверх кадра аватара."""
    snap = STATUS.snapshot()
    h, w = img.shape[:2]
    bar_h = max(36, h // 14)
    overlay = img.copy()
    cv2.rectangle(overlay, (0, h - bar_h), (w, h), (18, 20, 26), -1)
    img = cv2.addWeighted(overlay, 0.72, img, 0.28, 0)

    colors = {
        "idle": (120, 120, 120),
        "listen": (90, 180, 110),
        "think": (40, 180, 220),
        "speak": (220, 160, 70),
        "wake": (60, 140, 230),
        "error": (70, 70, 220),
        "mic_check": (40, 180, 220),
        "starting": (140, 140, 140),
    }
    state = snap["state"]
    color = colors.get(state, (160, 160, 160))
    label = STATE_LABELS.get(state, state)
    cv2.putText(
        img,
        label,
        (16, h - bar_h // 3),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        color,
        2,
        cv2.LINE_AA,
    )
    # mic level bar
    level = max(0.0, min(1.0, float(snap["mic_level"])))
    lx0, ly0 = w // 2, h - bar_h + 10
    lx1 = lx0 + int((w // 2 - 24) * level)
    cv2.rectangle(img, (lx0, ly0), (w - 16, h - 10), (40, 42, 50), -1)
    if lx1 > lx0:
        cv2.rectangle(img, (lx0, ly0), (lx1, h - 10), color, -1)
    return img


class AnamFace:
    """Окно аватара Anam. Ответ → talk_stream (lip-sync).

    Если ElevenLabs задан — аудио Anam глотаем (голос с колонок из ElevenLabs).
    Если нет — играем аудио Anam.
    """

    def __init__(self) -> None:
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._thread: Optional[threading.Thread] = None
        self._session = None
        self._ready = threading.Event()
        self._stop = threading.Event()
        self.enabled = bool(ENABLE_ANAM and ANAM_API_KEY and ANAM_PERSONA_ID)
        self.play_anam_audio = not bool(ELEVENLABS_API_KEY)

    def start(self) -> None:
        if not self.enabled:
            print("[anam] выключен")
            return
        self._thread = threading.Thread(target=self._run, name="anam-face", daemon=True)
        self._thread.start()
        ok = self._ready.wait(timeout=60)
        if not ok:
            print("[anam] таймаут подключения — работаем без лица")

    def _run(self) -> None:
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)
        try:
            self._loop.run_until_complete(self._main())
        except Exception as exc:
            print(f"[anam] session error: {exc}")
        finally:
            try:
                cv2.destroyAllWindows()
            except Exception:
                pass
            self._loop.close()

    async def _main(self) -> None:
        # По доке Anam: enable_audio_passthrough + talk() = лицо без их STT/LLM.
        # Иначе turnkey-пайплайн Anam конкурирует с нашим микрофоном/мозгом.
        from anam import AnamClient, PersonaConfig

        client = AnamClient(
            api_key=ANAM_API_KEY,
            persona_config=PersonaConfig(
                persona_id=ANAM_PERSONA_ID,
                enable_audio_passthrough=True,
            ),
        )
        async with client.connect() as session:
            self._session = session
            try:
                session.mute_input()
            except Exception:
                pass
            self._ready.set()
            print(f"[anam] connected session={session.session_id} (passthrough+mute_input)")

            async def show_video():
                window = "Anna"
                cv2.namedWindow(window, cv2.WINDOW_NORMAL)
                try:
                    async for frame in session.video_frames():
                        if self._stop.is_set():
                            break
                        img = frame.to_ndarray(format="bgr24")
                        if isinstance(img, np.ndarray) and img.size:
                            cv2.imshow(window, _draw_hud(img))
                            if cv2.waitKey(1) & 0xFF == ord("q"):
                                self._stop.set()
                                break
                finally:
                    try:
                        cv2.destroyWindow(window)
                    except Exception:
                        pass

            async def handle_audio():
                async for frame in session.audio_frames():
                    if self._stop.is_set():
                        break
                    if not self.play_anam_audio:
                        continue
                    samples = frame.to_ndarray()
                    if samples is None or samples.size == 0:
                        continue
                    audio = samples.astype(np.float32)
                    if audio.dtype != np.float32 or audio.max() > 1.0:
                        audio = audio.astype(np.float32) / 32768.0
                    rate = getattr(frame, "sample_rate", 48000) or 48000
                    # неблокирующий короткий буфер
                    sd.play(audio.reshape(-1), rate, blocking=False)

            await asyncio.gather(show_video(), handle_audio())

    def talk(self, text: str) -> None:
        if not self.enabled or not self._loop or not self._session or not text.strip():
            return
        fut = asyncio.run_coroutine_threadsafe(self._talk_async(text), self._loop)
        try:
            fut.result(timeout=90)
        except Exception as exc:
            print(f"[anam] talk failed: {exc}")

    async def _talk_async(self, text: str) -> None:
        assert self._session is not None
        stream = self._session.create_talk_stream()
        # режем длинный текст на куски для стрима
        chunk_size = 180
        parts = [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)] or [text]
        for i, part in enumerate(parts):
            await stream.send(part, end_of_speech=(i == len(parts) - 1))

    def stop(self) -> None:
        self._stop.set()
        if self._loop and self._session:
            try:
                fut = asyncio.run_coroutine_threadsafe(self._session.close(), self._loop)
                fut.result(timeout=5)
            except Exception:
                pass
