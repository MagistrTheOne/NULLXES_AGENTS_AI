from __future__ import annotations

import io
import time
import wave
from pathlib import Path
from typing import Callable

import numpy as np
import sounddevice as sd

from config import ACK_PATH, SAMPLE_RATE
from status import STATUS

LevelCb = Callable[[float], None]

# выбранный индекс входа (None = default OS)
INPUT_DEVICE: int | None = None

_SKIP_NAME = (
    "cable",
    "vb-audio",
    "stereomix",
    "stereo mix",
    "what u hear",
    "переназначение",
    "primary sound capture",
    "mapper",
)


def _dev_kwargs() -> dict:
    return {"device": INPUT_DEVICE} if INPUT_DEVICE is not None else {}


def _report_level(energy: float, cb: LevelCb | None = None) -> None:
    level = min(1.0, energy / 0.08)
    STATUS.update(mic_level=level)
    if cb:
        cb(level)


def list_input_devices() -> list[dict]:
    devices = []
    for i, d in enumerate(sd.query_devices()):
        if d.get("max_input_channels", 0) > 0:
            devices.append(
                {
                    "index": i,
                    "name": d["name"],
                    "channels": d["max_input_channels"],
                    "hostapi": d.get("hostapi", 0),
                }
            )
    return devices


def _probe_device(index: int, sample_rate: int, seconds: float = 0.45) -> float:
    frames = int(seconds * sample_rate)
    try:
        audio = sd.rec(
            frames,
            samplerate=sample_rate,
            channels=1,
            dtype="float32",
            device=index,
        )
        sd.wait()
        return float(np.sqrt(np.mean(np.square(audio))))
    except Exception:
        return -1.0


def _hostapi_name(hostapi: int) -> str:
    try:
        return sd.query_hostapis()[hostapi]["name"]
    except Exception:
        return str(hostapi)


def select_input_device(
    sample_rate: int = SAMPLE_RATE,
    preferred_index: int | None = None,
) -> tuple[bool, str, float]:
    """Выбрать микрофон. Предпочитаем WASAPI Fifine — MME часто даёт «тишину»."""
    global INPUT_DEVICE

    devices = list_input_devices()
    if not devices:
        return False, "нет устройств ввода", 0.0

    def _commit(idx: int, name: str, rms: float) -> tuple[bool, str, float]:
        global INPUT_DEVICE
        INPUT_DEVICE = idx
        try:
            out = sd.default.device[1] if isinstance(sd.default.device, (list, tuple)) else None
            sd.default.device = (idx, out)
        except Exception:
            pass
        api = _hostapi_name(sd.query_devices(idx).get("hostapi", 0))
        tip = "" if rms >= 0.002 else " ⚠ тихо"
        return True, f"{name} [{api}]{tip}", max(rms, 0.0)

    if preferred_index is not None:
        match = next((d for d in devices if d["index"] == preferred_index), None)
        if not match:
            return False, f"MIC_DEVICE_INDEX={preferred_index} не найден", 0.0
        # пишем на native rate устройства
        native = int(sd.query_devices(preferred_index).get("default_samplerate") or 44100)
        rms = _probe_device(preferred_index, native)
        return _commit(preferred_index, match["name"], rms)

    # авто: WASAPI + имя с Fifine/Microphone, иначе лучший RMS
    print("[mic] сканирую входы…")
    STATUS.update(state="mic_check", detail="Сканирую микрофоны…")
    ranked: list[tuple[float, dict]] = []
    for d in devices:
        name_l = d["name"].lower()
        if any(s in name_l for s in _SKIP_NAME):
            continue
        native = int(sd.query_devices(d["index"]).get("default_samplerate") or 44100)
        rms = _probe_device(d["index"], native, seconds=0.4)
        api = _hostapi_name(d["hostapi"])
        # бонус WASAPI / Fifine
        score = rms
        if "wasapi" in api.lower():
            score += 0.01
        if "fifine" in name_l:
            score += 0.02
        print(f"  [{d['index']}] rms={rms:.5f} score={score:.5f} {api} | {d['name'][:40]}")
        if rms >= 0:
            ranked.append((score, d, rms))

    if not ranked:
        return False, "не удалось открыть ни один вход", 0.0

    ranked.sort(key=lambda x: x[0], reverse=True)
    _, best, best_rms = ranked[0]
    return _commit(best["index"], best["name"], best_rms)


def check_microphone(sample_rate: int = SAMPLE_RATE, seconds: float = 1.0) -> tuple[bool, str, float]:
    """После select_input_device — контрольная запись с выбранного устройства."""
    global INPUT_DEVICE
    if INPUT_DEVICE is None:
        ok, name, peak = select_input_device(sample_rate)
        if not ok:
            return ok, name, peak

    try:
        name = sd.query_devices(INPUT_DEVICE)["name"] if INPUT_DEVICE is not None else "default"
    except Exception:
        name = f"device {INPUT_DEVICE}"

    native = _native_rate()
    block = int(native * 0.05)
    chunks: list[np.ndarray] = []
    peak = 0.0
    try:
        with sd.InputStream(
            samplerate=native,
            channels=1,
            dtype="float32",
            blocksize=block,
            **_dev_kwargs(),
        ) as stream:
            n = max(1, int(seconds / 0.05))
            for _ in range(n):
                data, _ = stream.read(block)
                mono = data[:, 0]
                chunks.append(mono.copy())
                e = float(np.sqrt(np.mean(mono**2)))
                peak = max(peak, e)
                _report_level(e)
        audio = np.concatenate(chunks) if chunks else np.zeros(frames, dtype=np.float32)
        rms = float(np.sqrt(np.mean(np.square(audio))))
        peak = max(peak, rms)
        tip = "" if peak >= 0.002 else " ⚠ тихо"
        return True, f"{name}{tip}", peak
    except Exception as exc:
        return False, str(exc), 0.0


def play_wav(path: Path | str) -> None:
    path = Path(path)
    if not path.exists():
        t = np.linspace(0, 0.15, int(SAMPLE_RATE * 0.15), False)
        tone = (0.25 * np.sin(2 * np.pi * 880 * t)).astype(np.float32)
        sd.play(tone, SAMPLE_RATE)
        sd.wait()
        return
    with wave.open(str(path), "rb") as wf:
        rate = wf.getframerate()
        frames = wf.readframes(wf.getnframes())
        audio = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
        if wf.getnchannels() > 1:
            audio = audio.reshape(-1, wf.getnchannels()).mean(axis=1)
    sd.play(audio, rate)
    sd.wait()


def play_ack() -> None:
    play_wav(ACK_PATH)


def _native_rate() -> int:
    if INPUT_DEVICE is None:
        return 44100
    try:
        return int(sd.query_devices(INPUT_DEVICE).get("default_samplerate") or 44100)
    except Exception:
        return 44100


def _resample_to(audio: np.ndarray, src_rate: int, dst_rate: int) -> np.ndarray:
    if src_rate == dst_rate or audio.size == 0:
        return audio
    try:
        from scipy import signal

        n = int(round(audio.size * dst_rate / src_rate))
        return signal.resample(audio, n).astype(np.float32)
    except Exception:
        # грубый downsample
        step = max(1, int(src_rate / dst_rate))
        return audio[::step].astype(np.float32)


def record_until_silence(
    sample_rate: int = SAMPLE_RATE,
    max_seconds: float = 12.0,
    silence_seconds: float = 1.1,
    energy_threshold: float = 0.008,
    min_speech_seconds: float = 0.35,
) -> np.ndarray:
    native = _native_rate()
    block = int(native * 0.05)
    chunks: list[np.ndarray] = []
    silent_blocks = 0
    heard_speech = False
    max_blocks = int(max_seconds / 0.05)
    need_silent = int(silence_seconds / 0.05)
    min_speech_blocks = int(min_speech_seconds / 0.05)

    with sd.InputStream(
        samplerate=native,
        channels=1,
        dtype="float32",
        blocksize=block,
        **_dev_kwargs(),
    ) as stream:
        for _ in range(max_blocks):
            data, _ = stream.read(block)
            mono = data[:, 0]
            chunks.append(mono.copy())
            energy = float(np.sqrt(np.mean(mono**2)))
            _report_level(energy)
            if energy >= energy_threshold:
                heard_speech = True
                silent_blocks = 0
            elif heard_speech:
                silent_blocks += 1
                if silent_blocks >= need_silent and len(chunks) >= min_speech_blocks:
                    break

    if not chunks:
        return np.zeros(0, dtype=np.float32)
    return _resample_to(np.concatenate(chunks), native, sample_rate)


def record_chunk(seconds: float = 1.6, sample_rate: int = SAMPLE_RATE) -> np.ndarray:
    native = _native_rate()
    block = int(native * 0.05)
    n_blocks = max(1, int(seconds / 0.05))
    chunks: list[np.ndarray] = []
    with sd.InputStream(
        samplerate=native,
        channels=1,
        dtype="float32",
        blocksize=block,
        **_dev_kwargs(),
    ) as stream:
        for _ in range(n_blocks):
            data, _ = stream.read(block)
            mono = data[:, 0]
            chunks.append(mono.copy())
            _report_level(float(np.sqrt(np.mean(mono**2))))
    if not chunks:
        return np.zeros(0, dtype=np.float32)
    return _resample_to(np.concatenate(chunks), native, sample_rate)


def float32_to_wav_bytes(audio: np.ndarray, sample_rate: int = SAMPLE_RATE) -> bytes:
    pcm = np.clip(audio, -1.0, 1.0)
    pcm16 = (pcm * 32767.0).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm16.tobytes())
    return buf.getvalue()
