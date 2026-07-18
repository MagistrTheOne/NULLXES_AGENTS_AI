"use client"

import { useState } from "react"
import { LoaderCircle } from "lucide-react"

import { GoogleIcon } from "@/components/auth/google-icon"
import { Button } from "@/components/ui/button"
import { signIn } from "@/lib/auth-client"

type GoogleButtonProps = {
  label?: string
  disabled?: boolean
  onError?: (message: string) => void
}

export function GoogleButton({
  label = "Продолжить с Google",
  disabled,
  onError,
}: GoogleButtonProps) {
  const [loading, setLoading] = useState(false)

  const onClick = async () => {
    if (loading || disabled) return
    setLoading(true)
    try {
      const { error } = await signIn.social({
        provider: "google",
        callbackURL: "/",
      })
      if (error) {
        onError?.(error.message || "Не удалось войти через Google")
        setLoading(false)
      }
    } catch (err) {
      onError?.(
        err instanceof Error ? err.message : "Не удалось войти через Google"
      )
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled || loading}
      onClick={() => void onClick()}
      className="h-12 w-full gap-2.5 rounded-xl border-white/10 bg-white/5 font-medium text-white normal-case tracking-normal hover:bg-white/10 hover:text-white disabled:opacity-40"
    >
      {loading ? (
        <LoaderCircle className="size-5 animate-spin" />
      ) : (
        <GoogleIcon className="size-5" />
      )}
      {loading ? "Google…" : label}
    </Button>
  )
}
