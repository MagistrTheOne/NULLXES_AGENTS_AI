import Link from "next/link"

export default function AgentsPage() {
  return (
    <main className="flex min-h-dvh flex-col px-6 py-8 md:px-10">
      <p className="text-[11px] font-medium tracking-[0.35em] text-white/50">
        AGENTS
      </p>
      <h1 className="mt-3 font-heading text-3xl font-medium tracking-tight text-white">
        Агенты NULLXES
      </h1>
      <p className="mt-2 max-w-lg text-sm text-white/45">
        Живые Digital Executive внутри платформы.
      </p>

      <Link
        href="/"
        className="mt-10 block max-w-md rounded-2xl bg-zinc-900/80 p-5 ring-1 ring-white/10 transition hover:ring-white/25"
      >
        <p className="font-heading text-xl text-white">Anna Maria</p>
        <p className="mt-1 text-sm text-white/45">Digital Executive · Available</p>
        <p className="mt-4 text-xs uppercase tracking-wide text-white/35">
          Открыть Overview →
        </p>
      </Link>
    </main>
  )
}
