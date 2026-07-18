# NULLXES Agents Frontend — Anna Maria

Full-frontend: **Next.js + Anam JS SDK + Better Auth + Neon Postgres**.

## Stack

- Anam WebRTC ([audio control](https://anam.ai/docs/javascript-sdk/reference/audio-control), [talk stream](https://anam.ai/docs/javascript-sdk/reference/talk-commands))
- Brain: `/api/chat-stream` (xAI / OpenAI)
- Auth: [Better Auth](https://better-auth.com/docs/installation) → Neon ([Next.js guide](https://neon.com/docs/guides/nextjs))
- Pages: `/login`, `/register` (shadcn)

## Run

```powershell
cd frontend\nullxes_agents_frontend
npm install
npm run dev
```

- App: http://localhost:3000  
- Login: http://localhost:3000/login  
- Register: http://localhost:3000/register  

## Env (`.env.local`)

- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
- `DATABASE_URL` (Neon)
- `ANAM_*`, `XAI_*` / `OPENAI_*`

## DB migrate

```powershell
echo y | .\node_modules\.bin\better-auth.cmd migrate
```
