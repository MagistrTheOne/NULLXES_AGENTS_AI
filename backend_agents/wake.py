from __future__ import annotations

import re

from config import WAKE_PHRASES


def normalize(text: str) -> str:
    text = text.lower().replace("ё", "е")
    # латиница часто приезжает из Whisper
    text = text.replace("anna", "анна").replace("salam", "салам")
    text = re.sub(r"[^\w\s]", " ", text, flags=re.UNICODE)
    return re.sub(r"\s+", " ", text).strip()


def is_wake(text: str, phrases: list[str] | None = None) -> bool:
    norm = normalize(text)
    if not norm:
        return False
    for phrase in phrases or WAKE_PHRASES:
        p = normalize(phrase)
        if p and p in norm:
            return True
    if re.search(r"\bанна\b", norm):
        return True
    if "салам" in norm and "анн" in norm:
        return True
    return False


def strip_wake(text: str, phrases: list[str] | None = None) -> str:
    norm = normalize(text)
    for phrase in sorted(phrases or WAKE_PHRASES, key=len, reverse=True):
        p = normalize(phrase)
        if norm.startswith(p):
            return norm[len(p) :].strip(" ,.-")
    return re.sub(r"^\s*(салам\s+)?анна\s*", "", norm).strip(" ,.-")
