# NULLXES_AGENTS_AI

Монорепозиторий **Anna Maria Nullxes** — Digital Executive для [NULLXES](https://github.com/MagistrTheOne).

| Пакет | Путь | Стек |
|--------|------|------|
| Backend agent | `backend_agents/` | Python 3.11, FastAPI bridge `:8787`, voice loop |
| Frontend | `frontend/nullxes_agents_frontend/` | Next.js 16, React 19, shadcn/ui |

## Quick start

### Backend

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r backend_agents\requirements.txt
# положите ключи в backend_agents\.env
.\.venv\Scripts\python.exe .\backend_agents\bridge.py
.\.venv\Scripts\python.exe .\backend_agents\main.py
```

Подробный контекст агента: [`backend_agents/claude.md`](backend_agents/claude.md).

### Frontend

```powershell
cd frontend\nullxes_agents_frontend
npm install
npm run dev
```

## Владелец

MagistrTheOne / NULLXES (Krasnodar).
