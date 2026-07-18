# NULLXES_AGENTS_AI

**Anna Maria Nullxes** — Digital Executive для NULLXES.

Стек: Next.js 16 · Anam JS SDK · Better Auth · Neon Postgres · xAI/OpenAI.

## Quick start

```powershell
npm install
npm run dev
```

| URL | Что |
|-----|-----|
| http://localhost:3000 | Anna live UI |
| http://localhost:3000/login | Вход |
| http://localhost:3000/register | Регистрация |

Секреты — в `.env.local` (не в git).

## Env

- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
- `DATABASE_URL` (Neon)
- `ANAM_*` (включая `ANAM_VOICE_ID`), `XAI_*` / `OPENAI_*`
- `GITHUB_*`, `GOOGLE_*` (OAuth)

## DB migrate

```powershell
echo y | .\node_modules\.bin\better-auth.cmd migrate
```

## Владелец

MagistrTheOne / NULLXES (Krasnodar).
