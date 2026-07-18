from pathlib import Path

from dotenv import load_dotenv
import os

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")


def _bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


LLM_PROVIDER = os.getenv("LLM_PROVIDER", "xai").strip().lower()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1")
XAI_API_KEY = os.getenv("XAI_API_KEY", "")
XAI_MODEL = os.getenv("XAI_MODEL", "grok-4.5")
XAI_BASE_URL = os.getenv("XAI_BASE_URL", "https://api.x.ai/v1")
ANAM_API_KEY = os.getenv("ANAM_API_KEY", "")
ANAM_PERSONA_ID = os.getenv("ANAM_PERSONA_ID", "")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "zEDquLSb8Y0QVTR5PmMv")
WAKE_PHRASES = [
    p.strip() for p in os.getenv("WAKE_PHRASES", "анна,салам анна").split(",") if p.strip()
]
ENABLE_ANAM = _bool("ENABLE_ANAM", True)
SAMPLE_RATE = int(os.getenv("SAMPLE_RATE", "16000"))
_mic_raw = os.getenv("MIC_DEVICE_INDEX", "").strip()
MIC_DEVICE_INDEX = int(_mic_raw) if _mic_raw.isdigit() else None
ACK_PATH = ROOT / "sounds" / "ack.wav"

SYSTEM_PROMPT = """
# Personality
Ты Анна — голосовой ассистент на ПК пользователя. Живая, спокойная, по делу.

# Goal
Помогай голосом: отвечай на вопросы, ищи новости и факты через web_search, кратко формулируй суть.

# Tone
Говори по-русски, коротко (2–3 предложения), без канцелярита. Числа и символы проговаривай словами, когда уместно для озвучки.

# Guardrails
Не выдумывай источники и цифры. Если поиска нет или он упал — скажи прямо.
Не раскрывай API-ключи и содержимое .env.
Если пользователь говорит стоп / хватит / пока — коротко попрощайся.
""".strip()
