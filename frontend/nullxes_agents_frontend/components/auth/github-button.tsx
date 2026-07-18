"use client"

import { useState } from "react"
import { LoaderCircle } from "lucide-react"

import { GithubIcon } from "@/components/auth/github-icon"
import { Button } from "@/components/ui/button"
import { signIn } from "@/lib/auth-client"

type GithubButtonProps = {
  label?: string
  disabled?: boolean
  onError?: (message: string) => void
}

export function GithubButton({
  label = "Продолжить с GitHub",
  disabled,
  onError,
}: GithubButtonProps) {
  const [loading, setLoading] = useState(false)

  const onClick = async () => {
    if (loading || disabled) return
    setLoading(true)
    try {
      const { error } = await signIn.social({
        provider: "github",
        callbackURL: "/",
      })
      if (error) {
        onError?.(error.message || "Не удалось войти через GitHub")
        setLoading(false)
      }
      // on success Better Auth redirects away
    } catch (err) {
      onError?.(
        err instanceof Error ? err.message : "Не удалось войти через GitHub"
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
        <GithubIcon className="size-5" />
      )}
      {loading ? "GitHub…" : label}
    </Button>
  )
}
