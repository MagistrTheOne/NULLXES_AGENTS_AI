from __future__ import annotations

import io
import re

import numpy as np
from openai import OpenAI

from audio_io import float32_to_wav_bytes
from config import OPENAI_API_KEY, SAMPLE_RATE

_HALLUCINATION = re.compile(
    r"(редактор субтитров|корректор|субтитры|subscribe|amara\.org|"
    r"продолжение следует|thanks for watching|подписывайтесь|"
    r"^[\.\,\!\?\s]+$)",
    re.I,
)


def _client() -> OpenAI:
    return OpenAI(api_key=OPENAI_API_KEY)


def amplify(audio: np.ndarray, target_rms: float = 0.08, max_gain: float = 40.0) -> np.ndarray:
    """AGC: поднять тихий Fifine до нормального уровня для Whisper."""
    if audio.size == 0:
        return audio
    rms = float(np.sqrt(np.mean(np.square(audio))))
    if rms < 1e-8:
        return audio
    gain = min(max_gain, target_rms / rms)
    out = audio.astype(np.float32) * gain
    return np.clip(out, -1.0, 1.0)


def transcribe(audio: np.ndarray, sample_rate: int = SAMPLE_RATE, language: str = "ru") -> str:
    if audio.size == 0:
        return ""
    rms = float(np.sqrt(np.mean(np.square(audio))))
    if rms < 0.00025:
        return ""

    boosted = amplify(audio)
    wav = float32_to_wav_bytes(boosted, sample_rate)
    file_obj = io.BytesIO(wav)
    file_obj.name = "speech.wav"
    client = _client()
    result = client.audio.transcriptions.create(
        model="whisper-1",
        file=file_obj,
        language=language,
        temperature=0.0,
        prompt="Салам Анна. Анна. Голосовой ассистент.",
    )
    text = (result.text or "").strip()
    if not text or _HALLUCINATION.search(text):
        return ""
    return text
