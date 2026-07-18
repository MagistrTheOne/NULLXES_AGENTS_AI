import type { Metadata } from "next"
import Link from "next/link"

import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = {
  title: "Вход · NULLXES",
  description: "Авторизация Anna Maria Nullxes",
}

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-black px-4 py-12 text-white">
      <LoginForm />

      <p className="mt-6 text-sm text-white/45">
        Нет аккаунта?{" "}
        <Link
          href="/register"
          className="text-white underline-offset-4 hover:underline"
        >
          Регистрация
        </Link>
      </p>
    </main>
  )
}
