import { redirect } from "next/navigation"

import { requireSession, toAppUser } from "@/lib/session"

export default async function SettingsPage() {
  const session = await requireSession()
  const user = toAppUser(session?.user)
  if (!user) redirect("/login")

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col px-6 py-8 md:px-10">
      <p className="text-[11px] font-medium tracking-[0.35em] text-white/50">
        SETTINGS
      </p>
      <h1 className="mt-3 font-heading text-3xl font-medium tracking-tight text-white">
        Аккаунт
      </h1>
      <p className="mt-2 text-sm text-white/45">
        Данные сессии Better Auth · Neon.
      </p>

      <dl className="mt-10 space-y-5 text-sm">
        <div>
          <dt className="text-white/40">Имя</dt>
          <dd className="mt-1 text-white">{user.name}</dd>
        </div>
        <div>
          <dt className="text-white/40">Email</dt>
          <dd className="mt-1 text-white">{user.email}</dd>
        </div>
        <div>
          <dt className="text-white/40">User ID</dt>
          <dd className="mt-1 break-all font-mono text-xs text-white/70">
            {user.id}
          </dd>
        </div>
      </dl>
    </main>
  )
}
