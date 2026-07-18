from __future__ import annotations

from elevenlabs import ElevenLabs
from elevenlabs.play import play

from config import ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID


def speak(text: str) -> None:
    text = (text or "").strip()
    if not text:
        return
    if not ELEVENLABS_API_KEY:
        print("[tts] ELEVENLABS_API_KEY пуст — печатаю ответ текстом:")
        print(text)
        return

    client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
    audio = client.text_to_speech.convert(
        text=text,
        voice_id=ELEVENLABS_VOICE_ID,
        model_id="eleven_multilingual_v2",
        output_format="mp3_44100_128",
    )
    play(audio)
