# Anna backend — контекст для Claude / следующих агентов

> Папка: `backend_agents/` (раньше называлась `agent/`).  
> Продукт: **Anna Maria Nullxes** — Digital Executive NULLXES.  
> Владелец: MagistrTheOne / NULLXES (Krasnodar).  
> Фронт (`web/`) сейчас реинициализирует человек сам — бэкенд здесь.

---

## 1. Что это

Локальный голосовой агент на Windows ПК:

1. Слушает микрофон (Fifine, WASAPI).
2. Wake: **«Анна»** / **«Салам Анна»**.
3. Открывает **сессию** (дальше команды без повторного wake).
4. STT → LLM (xAI Grok или OpenAI) + web_search + KB → TTS ElevenLabs + лицо Anam.
5. FastAPI bridge отдаёт статус/studio API для Next.js UI.

Продуктовая рамка: не клон Reception.ai, а **Digital Executive** + позже inbound-телефон на тех же prompt/voice/KB.

---

## 2. Стек и зависимости

| Слой | Технология |
|------|------------|
| Runtime | Python 3.11, venv в корне: `.venv` |
| LLM | OpenAI SDK; xAI через `base_url=https://api.x.ai/v1`; пакет `xai-sdk` тоже установлен |
| STT | OpenAI Whisper (`whisper-1`) |
| TTS | ElevenLabs (`eleven_multilingual_v2`), voice id в `.env` |
| Avatar | Anam Python SDK `anam[display]` — WebRTC video + `talk_stream` |
| Mic/speakers | sounddevice, numpy, scipy (resample) |
| Desktop UI status | tkinter (`ui.py`) + OpenCV HUD на Anam |
| Bridge | FastAPI + uvicorn `:8787` |
| Persist | `data/settings.json`, `data/knowledge/*`, `data/sessions.jsonl`, `data/live_status.json` |

Установка зависимостей из корня репо:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r backend_agents\requirements.txt
```

---

## 3. Структура файлов

```
backend_agents/
  .env                 # секреты и конфиг (не коммитить)
  claude.md            # этот файл
  requirements.txt
  config.py            # load_dotenv, SYSTEM_PROMPT, флаги
  main.py              # desktop voice loop (точка входа агента)
  bridge.py            # HTTP/WS для фронта :8787
  brain.py             # LLM ask() + KB + web_search
  stt.py               # Whisper + AGC
  tts.py               # ElevenLabs speak()
  wake.py              # is_wake / strip_wake
  audio_io.py          # mic select, record, ack
  anam_face.py         # Anam session, passthrough, mute_input, HUD
  ui.py                # tkinter status window
  status.py            # shared state → data/live_status.json
  studio_store.py      # settings, KB, session log
  phone_channel.py     # scaffold inbound / Reception path
  sounds/ack.wav       # должен быть (см. известные пробелы)
  data/
    settings.json
    knowledge/nullxes.md
    sessions.jsonl     # появляется при работе
    live_status.json   # sync main ↔ bridge
```

Корень монорепо: `D:\NULLXES\NULLXES MAGAS\`  
Venv: `D:\NULLXES\NULLXES MAGAS\.venv\`  
Фронт (отдельный трек): `web/` — Next.js 16, человек реинит shadcn сам.

---

## 4. Секреты и env

Файл: `backend_agents/.env` (уже заполнен у владельца).

| Переменная | Назначение |
|------------|------------|
| `LLM_PROVIDER` | `xai` (default) или `openai` |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | Whisper STT + опционально мозг |
| `XAI_API_KEY` / `XAI_MODEL` / `XAI_BASE_URL` | Grok (`grok-4.5`, `https://api.x.ai/v1`) |
| `ANAM_API_KEY` / `ANAM_PERSONA_ID` | Avatar persona |
| `ELEVENLABS_API_KEY` / `ELEVENLABS_VOICE_ID` | TTS (`zEDquLSb8Y0QVTR5PmMv`) |
| `WAKE_PHRASES` | `анна,салам анна` |
| `ENABLE_ANAM` | `1` |
| `SAMPLE_RATE` | `16000` (после resample; native rate устройства выше) |
| `MIC_DEVICE_INDEX` | `33` = Fifine WASAPI (MME `1` часто «тишина») |

Правило владельца: ключи живут сразу в `.env`, без `.env.example` и без security-лекций в коде.

Studio может переопределить `llm_provider` и `system_prompt` в `data/settings.json` (приоритетнее дефолта из `config.py` для мозга).

---

## 5. Запуск (три процесса)

Из корня `NULLXES MAGAS`:

```powershell
# A) bridge для UI
.\.venv\Scripts\python.exe .\backend_agents\bridge.py
# → http://127.0.0.1:8787

# B) голосовой агент на ПК
.\.venv\Scripts\python.exe .\backend_agents\main.py

# C) фронт (когда web готов)
cd web
npm run dev
# → http://localhost:3000
# NEXT_PUBLIC_AGENT_API=http://127.0.0.1:8787
```

Ожидаемый UX голоса:

1. Idle: ждёт wake.
2. «Салам Анна» → ack beep → **session open**.
3. Команды без повторного wake; «думаю» только если есть текст команды.
4. «Стоп» / «пока» или ~4 пустых listen → снова idle.

---

## 6. Пайплайн (desktop)

```
Mic (WASAPI Fifine)
  → record_chunk / record_until_silence (native rate → resample 16k)
  → stt.transcribe (AGC + whisper-1, prompt про Анну)
  → wake.is_wake?
       no  → idle
       yes → play_ack → conversation_session
              → listen → brain.ask → anam.talk_stream + elevenlabs.speak
              → listen again…
```

**Anam:** `PersonaConfig(persona_id=…, enable_audio_passthrough=True)` + `session.mute_input()` — лицо без захвата mic; голос с колонок = ElevenLabs; Anam audio frames глотаем если есть ElevenLabs key.

**Brain:** Responses API + `tools=[{type: web_search}]`, fallback chat.completions. System = studio prompt или `SYSTEM_PROMPT` + блок Knowledge base из `data/knowledge/*.md|*.txt`.

**Status sync:** `main` и `bridge` — разные процессы. Состояние пишется в `data/live_status.json`; `STATUS.snapshot()` читает диск.

---

## 7. Bridge API (для фронта)

Base: `http://127.0.0.1:8787` (CORS `*`)

| Method | Path | Зачем |
|--------|------|--------|
| GET | `/health` | ping |
| GET | `/status` | live snapshot (state, heard, command, reply, mic_level, available, session_open) |
| WS | `/ws/status` | то же каждые 0.5s |
| POST | `/session/start` | UI «Talk» — подсказка ждать wake на ПК |
| POST | `/voice/preview` | mp3 ElevenLabs preview |
| GET/POST | `/studio/settings` | llm_provider, system_prompt, phone |
| GET/POST | `/studio/knowledge` | список / upload file |
| POST | `/studio/knowledge/text` | добавить markdown |
| GET | `/studio/sessions` | лог событий |
| GET/POST | `/studio/phone` | inbound config + bootstrap payload |

В `bridge.py` в шапке ещё может торчать старый комментарий `python agent/bridge.py` — путь актуальный: `backend_agents/bridge.py`.

---

## 8. UI продукт (ожидание от фронта)

Карточка **Anna Maria Nullxes / Digital Executive**:

- Available badge ← `status.available` / state
- Talk · live → `POST /session/start` + desktop mic session
- Voice · 1 min → `POST /voice/preview`
- Studio: prompt, KB, LLM switch, phone, session log

Тема: near-black + bronze/gold, не фиолетовый AI-дефолт.  
Референс Reception.ai — только операционная модель (KB, rules, phone, analytics), не SMB booking CRM в v1.

---

## 9. Phone / LiveKit (Phase D)

Файл: `phone_channel.py` + `data/settings.json` → `phone`.

- **Номер куплен:** `+1 484 304 0115` / `+14843040115` (LiveKit Phone Numbers).
- Провайдер: `livekit` (не Reception.ai как основной путь).
- Цель: inbound → LiveKit room → Agent worker `anna-nullxes` → тот же brain/KB/ElevenLabs voice, что desktop.
- Сейчас без кода worker: в Cloud сделать **Create new dispatch rule**, привязать номер.
- Поля: `phone_number`, `livekit_agent_name`, `livekit_room_prefix`, `dispatch_rule_id` (заполнить после создания rule).
- Доки: https://docs.livekit.io/telephony/accepting-calls/dispatch-rule/
- Для связки позже понадобятся ещё: LiveKit **URL + API Key + API Secret** проекта (в `.env`: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`).

---

## 10. Известные грабли (не повторять)

1. **Mic MME vs WASAPI:** index `1` Fifine MME часто RMS≈0; нужен WASAPI (~`33`). Список печатает `main` при старте.
2. **После Anam mic «тихо»:** обязателен passthrough + `mute_input`; иначе WebRTC/turnkey конкурирует с mic.
3. **Whisper на тишине:** галлюцинации («Редактор субтитров…») — фильтр в `stt.py` + порог RMS + AGC.
4. **Пустая команда после wake:** не вызывать brain; сессия должна оставаться в listen.
5. **Два процесса status:** только через `live_status.json`, не in-memory.
6. **`sounds/ack.wav`:** при переносе в `backend_agents/` файл мог пропасть — `audio_io.play_ack` умеет fallback-beep, но лучше восстановить `sounds/ack.wav`.
7. **npm `ECOMPROMISED` / Lock compromised** на `npx shadcn`: это lock `libnpmexec` (параллельный npx / битый `_npx` cache), не обязательно битый `package-lock.json`. Лечится чисткой npm cache/`_npx`, не гонять два npx сразу. Фронт реинит владелец.
8. **GitHub:** аккаунт владельца публичный `MagistrTheOne`; локальный `gh` мог быть не установлен / не залогинен — приватные репы недоступны без `gh auth login`.
9. Импорты модулей: `sys.path.insert(0, backend_agents)` — запускать из корня репо как выше, не ломать относительные импорты.

---

## 11. Что делать в следующих итерациях (бэкенд)

Приоритеты по убыванию:

1. Убедиться что `sounds/ack.wav` на месте; поправить комментарии `agent/` → `backend_agents/`.
2. Стабильный mic: авто-выбор WASAPI Fifine, AGC, логи RMS в session log.
3. Стриминг TTS / быстрее wake (локальный faster-whisper на RTX 2080 — опционально).
4. Когда фронт готов: проверить CORS + `NEXT_PUBLIC_AGENT_API` и контракт `/status`.
5. Phone: заполнить agent_id + номер; синхронизировать system prompt + KB в ElevenLabs Agent.
6. Не тащить в v1 полный Reception booking/CRM.

---

## 12. Контакты / бренд (для промптов и KB)

- Компания: **NULLXES** — Digital Employee Infrastructure  
- Персона: **Anna Maria Nullxes**, Digital Executive  
- GitHub (public): https://github.com/MagistrTheOne  
- Тон: русский, коротко, по делу; wake «Салам Анна»

---

## 13. Быстрый чеклист агенту перед правками

- [ ] Правишь код в `backend_agents/`, не в старом `agent/`
- [ ] Не коммить `.env`
- [ ] После смены status — проверить запись в `data/live_status.json`
- [ ] Brain: не ломать web_search + KB merge
- [ ] Anam: не убирать passthrough/mute без причины
- [ ] Сессия: пустой STT ≠ think
- [ ] Фронт — чужой трек; меняй API контракт осознанно и опиши в этом файле
