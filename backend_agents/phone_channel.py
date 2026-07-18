"""Inbound phone — LiveKit Cloud number + позже связка с Анной.

Номер: +1 484 304 0115 (LiveKit Phone Numbers).
Доки dispatch: https://docs.livekit.io/telephony/accepting-calls/dispatch-rule/

Desktop Анна = main.py. Телефон = отдельный канал на тех же prompt/KB/voice.
Пока: номер куплен; нужен dispatch rule + LiveKit Agent worker (следующая итерация).
"""

from __future__ import annotations

from studio_store import knowledge_context, load_settings


def phone_bootstrap_payload() -> dict:
    s = load_settings()
    phone = s.get("phone") or {}
    number = phone.get("phone_number") or ""
    rule = phone.get("dispatch_rule_id") or ""
    agent_name = phone.get("livekit_agent_name") or "anna-nullxes"
    return {
        "enabled": bool(phone.get("enabled")),
        "provider": phone.get("provider") or "livekit",
        "phone_number": number,
        "dispatch_rule_id": rule,
        "livekit_agent_name": agent_name,
        "llm_provider": s.get("llm_provider"),
        "system_prompt": s.get("system_prompt") or "",
        "knowledge_preview": knowledge_context(1500),
        "ready": bool(phone.get("enabled") and number and rule),
        "next_steps": [
            "LiveKit Cloud → Create new dispatch rule (не attach к чужому catch-all)",
            f"Individual rooms, prefix: {phone.get('livekit_room_prefix') or 'anna-call-'}",
            f"Agent dispatch name: {agent_name}",
            "Привяжи номер +14843040115 к этому rule",
            "Потом: LiveKit Agents worker (Python) с тем же именем + ElevenLabs TTS / наш brain",
            "В settings.json заполни dispatch_rule_id когда rule создан",
        ],
    }
