const STUB = [
  { id: "1", title: "Брифинг по NULLXES", when: "Сегодня", preview: "Коротко: приоритеты недели…" },
  { id: "2", title: "Онбординг", when: "Вчера", preview: "Привет, я Анна Мария…" },
  { id: "3", title: "Вопросы по продукту", when: "Пн", preview: "Разберём стек и роли…" },
]

export default function ConversationsPage() {
  return (
    <main className="flex min-h-dvh">
      <aside className="flex w-full max-w-sm flex-col border-r border-white/10 bg-zinc-950/80">
        <div className="border-b border-white/5 px-5 py-5">
          <p className="text-[11px] font-medium tracking-[0.35em] text-white/50">
            CONVERSATIONS
          </p>
          <h1 className="mt-2 font-heading text-2xl text-white">История</h1>
          <p className="mt-1 text-sm text-white/40">
            Диалоги NULLXES · без внешних брендов
          </p>
        </div>
        <ul className="flex-1 overflow-y-auto p-2">
          {STUB.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="flex w-full flex-col gap-1 rounded-xl px-3 py-3 text-left hover:bg-white/5"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm text-white/90">{c.title}</span>
                  <span className="shrink-0 text-[11px] text-white/35">{c.when}</span>
                </div>
                <span className="truncate text-xs text-white/40">{c.preview}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="hidden flex-1 flex-col items-center justify-center px-8 md:flex">
        <p className="font-heading text-2xl text-white/80">Выбери диалог</p>
        <p className="mt-2 max-w-sm text-center text-sm text-white/40">
          Здесь появится лента сообщений. Сейчас — заглушка под будущую историю
          NULLXES.
        </p>
      </section>
    </main>
  )
}
