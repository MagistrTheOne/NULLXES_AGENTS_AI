from __future__ import annotations

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import audio_io
from anam_face import AnamFace
from audio_io import (
    check_microphone,
    list_input_devices,
    play_ack,
    record_chunk,
    record_until_silence,
    select_input_device,
)
from brain import ask
from config import ELEVENLABS_API_KEY, LLM_PROVIDER, MIC_DEVICE_INDEX, SAMPLE_RATE
from status import STATUS
from studio_store import append_session_event, ensure_dirs
from stt import transcribe
from tts import speak
from ui import AnnaUI
from wake import is_wake, strip_wake

# после wake: сколько пустых прослушиваний подряд → снова ждать «Анна»
SESSION_EMPTY_LIMIT = 4


def _is_stop(text: str) -> bool:
    t = text.lower().replace("ё", "е")
    return any(w in t for w in ("стоп", "хватит", "выключись", "пока", "до свидания"))


def _rms(audio) -> float:
    if audio.size == 0:
        return 0.0
    return float((audio**2).mean() ** 0.5)


def _reply(face: AnamFace, text: str) -> None:
    STATUS.update(state="speak", reply=text, detail="Озвучиваю…")
    face.talk(text)
    speak(text)


def _listen_command() -> str:
    """Одна фраза до паузы. Пусто = тишина / не расслышала."""
    STATUS.update(state="listen", detail="Слушаю команду…")
    audio = record_until_silence(
        max_seconds=14.0,
        silence_seconds=1.25,
        energy_threshold=0.004,
    )
    rms = _rms(audio)
    if rms < 0.0004:
        return ""
    try:
        text = transcribe(audio).strip()
    except Exception as exc:
        print(f"[stt cmd] {exc}")
        STATUS.update(state="error", detail=str(exc))
        return ""
    return text


def conversation_session(face: AnamFace, first_command: str = "") -> None:
    """После wake: крутим команды без повторного «Анна», пока не тишина / стоп."""
    empty = 0
    pending = (first_command or "").strip()
    STATUS.session_open = True
    append_session_event({"type": "session_open", "channel": "desktop"})

    STATUS.update(
        state="listen",
        detail="Сессия открыта — говори команды. «Стоп» или пауза — выход.",
    )
    print("[session] open — команды без wake")

    try:
        while True:
            if pending:
                command = pending
                pending = ""
            else:
                command = _listen_command()

            STATUS.update(command=command or "—", heard=command or "(тихо)")
            print(f"[command] {command!r}")

            if not command:
                empty += 1
                STATUS.update(
                    state="listen",
                    detail=f"Жду команду… ({empty}/{SESSION_EMPTY_LIMIT})",
                )
                if empty >= SESSION_EMPTY_LIMIT:
                    print("[session] timeout → idle")
                    STATUS.update(detail="Сессия закрыта — снова скажи «Анна»")
                    return
                continue

            empty = 0

            if _is_stop(command):
                _reply(face, "Хорошо, на связи. Позови снова.")
                STATUS.update(state="idle", detail="Скажи «Салам Анна»")
                print("[session] stop → idle")
                return

            STATUS.update(state="think", detail="Думаю…", command=command)
            print("[think]")
            reply = ask(command)
            print(f"[reply] {reply}")
            STATUS.update(reply=reply)
            append_session_event(
                {"type": "turn", "channel": "desktop", "command": command, "reply": reply}
            )
            _reply(face, reply)
            STATUS.update(state="listen", detail="Ещё вопрос? Говори…")
    finally:
        STATUS.session_open = False
        append_session_event({"type": "session_close", "channel": "desktop"})


def main() -> None:
    ensure_dirs()
    ui = AnnaUI()
    ui.start()

    print("=" * 48)
    print("Входы (MIC_DEVICE_INDEX в agent/.env):")
    for d in list_input_devices():
        print(f"  {d['index']}: {d['name']}")

    STATUS.update(state="mic_check", detail="Выбираю микрофон…")
    ok, device, peak = select_input_device(SAMPLE_RATE, preferred_index=MIC_DEVICE_INDEX)
    if ok:
        ok2, device2, peak2 = check_microphone(SAMPLE_RATE, seconds=1.0)
        if ok2:
            device, peak = device2, peak2
    STATUS.update(mic_ok=ok, mic_device=device, detail=f"RMS={peak:.4f} idx={audio_io.INPUT_DEVICE}")

    if not ok:
        print(f"mic FAIL: {device}")
        STATUS.update(state="error", detail=device)
        time.sleep(8)
        ui.stop()
        return

    print(f"mic OK idx={audio_io.INPUT_DEVICE}: {device} (peak {peak:.4f})")
    print(f"мозг: {LLM_PROVIDER} | elevenlabs: {'да' if ELEVENLABS_API_KEY else 'нет'}")
    print("wake → сессия команд → «стоп» или тишина → снова wake")
    print("=" * 48)

    STATUS.update(state="starting", detail="Anam…")
    face = AnamFace()
    face.start()
    check_microphone(SAMPLE_RATE, seconds=0.5)

    STATUS.update(state="idle", detail="Скажи «Салам Анна»")
    quiet_streak = 0

    try:
        while True:
            chunk = record_chunk(2.8, SAMPLE_RATE)
            rms = _rms(chunk)
            STATUS.update(state="idle", detail=f"ждёт wake… RMS={rms:.4f}")

            if rms < 0.00035:
                quiet_streak += 1
                if quiet_streak % 4 == 1:
                    STATUS.update(heard="(тихо)")
                    print(f"[quiet] rms={rms:.5f}")
                continue
            quiet_streak = 0

            try:
                heard = transcribe(chunk)
            except Exception as exc:
                print(f"[stt wake] {exc}")
                continue

            STATUS.update(heard=heard or "(пусто)")
            print(f"[hear] rms={rms:.4f} → {heard!r}")

            if not heard or not is_wake(heard):
                continue

            print(f"[wake] {heard}")
            STATUS.update(state="wake", heard=heard, command="", reply="", detail="Услышала!")
            play_ack()

            leftover = strip_wake(heard).strip()
            # если в том же куске уже была команда («Анна, новости») — сразу в сессию с ней
            conversation_session(face, first_command=leftover)

            STATUS.update(state="idle", detail="Скажи «Салам Анна»")

    except KeyboardInterrupt:
        print("\nСтоп.")
    finally:
        STATUS.update(state="idle", detail="Оффлайн")
        face.stop()
        ui.stop()


if __name__ == "__main__":
    main()
