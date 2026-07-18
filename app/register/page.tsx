import type { Metadata } from "next"
import Link from "next/link"

import { RegisterForm } from "@/components/auth/register-form"

export const metadata: Metadata = {
  title: "Регистрация · NULLXES",
  description: "Создать аккаунт Anna Maria Nullxes",
}

export default function RegisterPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-black px-4 py-12 text-white">
      <RegisterForm />

      <p className="mt-6 text-sm text-white/45">
        Уже есть аккаунт?{" "}
        <Link
          href="/login"
          className="text-white underline-offset-4 hover:underline"
        >
          Войти
        </Link>
      </p>
    </main>
  )
}
