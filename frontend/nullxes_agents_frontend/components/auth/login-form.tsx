"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, LoaderCircle } from "lucide-react"

import { GithubButton } from "@/components/auth/github-button"
import { GoogleButton } from "@/components/auth/google-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { signIn } from "@/lib/auth-client"

const fieldClassName =
  "h-12 rounded-xl border border-white/8 bg-white/3.5 px-4 text-white focus-visible:ring-2 focus-visible:ring-white/10"

export function LoginForm() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (loading) return

    setError(null)
    setLoading(true)

    try {
      const normalizedEmail = email.trim().toLowerCase()

      const { error: authError } = await signIn.email({
        email: normalizedEmail,
        password,
      })

      if (authError) {
        setError(authError.message || "Неверный email или пароль")
        return
      }

      router.replace("/")
      router.refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось выполнить вход. Попробуйте ещё раз."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="w-full max-w-[420px]">
      <div className="mb-10 text-center">
        <div className="mb-8 text-[11px] font-medium tracking-[0.34em] text-white/45">
          NULLXES
        </div>

        <h1 className="text-3xl font-medium tracking-[-0.04em] text-white">
          Добро пожаловать
        </h1>

        <p className="mt-3 text-sm leading-6 text-white/45">
          Войдите в рабочее пространство NULLXES.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-[28px] border border-white/8 bg-white/2.5 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8 [&_input::placeholder]:text-white/20"
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="login-email"
              className="text-sm font-medium text-white/70"
            >
              Email
            </label>

            <Input
              id="login-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              required
              disabled={loading}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                if (error) setError(null)
              }}
              placeholder="name@company.com"
              className={fieldClassName}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="text-sm font-medium text-white/70"
              >
                Пароль
              </label>

              <button
                type="button"
                className="text-xs text-white/35 transition-colors hover:text-white/65"
              >
                Забыли пароль?
              </button>
            </div>

            <div className="relative">
              <Input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                disabled={loading}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  if (error) setError(null)
                }}
                placeholder="Введите пароль"
                className={`${fieldClassName} pr-12`}
              />

              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-2 text-white/30 transition-colors hover:bg-white/5 hover:text-white/70"
                aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          <div
            className={`grid transition-all duration-200 ${
              error
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <p
                role="alert"
                aria-live="polite"
                className="rounded-xl border border-red-400/10 bg-red-400/6 px-4 py-3 text-sm text-red-300"
              >
                {error}
              </p>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !email.trim() || !password}
            className="h-12 w-full rounded-xl bg-white font-medium text-black transition-all hover:bg-white/90 active:scale-[0.99] disabled:opacity-40"
          >
            {loading ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Вход
              </>
            ) : (
              "Продолжить"
            )}
          </Button>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/8" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-black px-3 text-[11px] tracking-wide text-white/30 uppercase">
                или
              </span>
            </div>
          </div>

          <div className="grid gap-2.5">
            <GoogleButton
              disabled={loading}
              onError={(message) => setError(message)}
            />
            <GithubButton
              disabled={loading}
              onError={(message) => setError(message)}
            />
          </div>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-white/25">
          Защищённый доступ к цифровой рабочей среде.
        </p>
      </form>
    </section>
  )
}
