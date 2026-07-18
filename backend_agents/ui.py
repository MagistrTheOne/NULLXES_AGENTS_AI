from __future__ import annotations

import threading
import tkinter as tk

from status import STATE_LABELS, STATUS


COLORS = {
    "bg": "#12141a",
    "panel": "#1a1d26",
    "text": "#e8e6e3",
    "muted": "#8b909a",
    "idle": "#6b7280",
    "listen": "#3d9a6a",
    "think": "#c9a227",
    "speak": "#4a8fd4",
    "wake": "#d4783a",
    "error": "#c44b4b",
    "bar_bg": "#2a2e38",
}


class AnnaUI:
    def __init__(self) -> None:
        self._root: tk.Tk | None = None
        self._thread: threading.Thread | None = None
        self._ready = threading.Event()

    def start(self) -> None:
        self._thread = threading.Thread(target=self._run, name="anna-ui", daemon=True)
        self._thread.start()
        self._ready.wait(timeout=5)

    def _run(self) -> None:
        root = tk.Tk()
        self._root = root
        root.title("Анна — статус")
        root.configure(bg=COLORS["bg"])
        root.geometry("360x420+40+80")
        root.minsize(320, 360)
        root.attributes("-topmost", True)

        pad = {"padx": 16, "pady": 6}

        title = tk.Label(
            root,
            text="АННА",
            font=("Segoe UI Semibold", 18),
            fg=COLORS["text"],
            bg=COLORS["bg"],
        )
        title.pack(anchor="w", padx=16, pady=(16, 0))

        self.state_lbl = tk.Label(
            root,
            text="Запуск…",
            font=("Segoe UI", 14),
            fg=COLORS["idle"],
            bg=COLORS["bg"],
        )
        self.state_lbl.pack(anchor="w", **pad)

        self.detail_lbl = tk.Label(
            root,
            text="",
            font=("Segoe UI", 9),
            fg=COLORS["muted"],
            bg=COLORS["bg"],
            wraplength=320,
            justify="left",
        )
        self.detail_lbl.pack(anchor="w", padx=16)

        # mic block
        mic_frame = tk.Frame(root, bg=COLORS["panel"], highlightthickness=0)
        mic_frame.pack(fill="x", padx=16, pady=10)

        self.mic_lbl = tk.Label(
            mic_frame,
            text="Микрофон: …",
            font=("Segoe UI", 10),
            fg=COLORS["text"],
            bg=COLORS["panel"],
            anchor="w",
        )
        self.mic_lbl.pack(fill="x", padx=12, pady=(10, 4))

        self.level_canvas = tk.Canvas(
            mic_frame,
            height=14,
            bg=COLORS["bar_bg"],
            highlightthickness=0,
        )
        self.level_canvas.pack(fill="x", padx=12, pady=(0, 10))
        self._level_bar = self.level_canvas.create_rectangle(0, 0, 0, 14, fill=COLORS["listen"], width=0)

        # transcript
        box = tk.Frame(root, bg=COLORS["panel"])
        box.pack(fill="both", expand=True, padx=16, pady=(0, 16))

        self.heard_lbl = self._line(box, "Слышу")
        self.cmd_lbl = self._line(box, "Команда")
        self.reply_lbl = self._line(box, "Ответ")

        self._ready.set()
        self._tick()
        root.mainloop()

    def _line(self, parent: tk.Widget, caption: str) -> tk.Label:
        tk.Label(
            parent,
            text=caption,
            font=("Segoe UI", 8),
            fg=COLORS["muted"],
            bg=COLORS["panel"],
            anchor="w",
        ).pack(fill="x", padx=12, pady=(10, 0))
        lbl = tk.Label(
            parent,
            text="—",
            font=("Segoe UI", 10),
            fg=COLORS["text"],
            bg=COLORS["panel"],
            wraplength=300,
            justify="left",
            anchor="nw",
        )
        lbl.pack(fill="x", padx=12, pady=(2, 0))
        return lbl

    def _tick(self) -> None:
        if not self._root:
            return
        snap = STATUS.snapshot()
        state = snap["state"]
        color = {
            "idle": COLORS["idle"],
            "mic_check": COLORS["think"],
            "wake": COLORS["wake"],
            "listen": COLORS["listen"],
            "think": COLORS["think"],
            "speak": COLORS["speak"],
            "error": COLORS["error"],
            "starting": COLORS["muted"],
        }.get(state, COLORS["idle"])

        self.state_lbl.config(text=STATE_LABELS.get(state, state), fg=color)
        self.detail_lbl.config(text=snap["detail"] or "")

        if snap["mic_ok"] is True:
            mic_text = f"Микрофон: OK — {snap['mic_device'][:42]}"
            mic_fg = COLORS["listen"]
        elif snap["mic_ok"] is False:
            mic_text = f"Микрофон: НЕТ — {snap['detail'] or 'не найден'}"
            mic_fg = COLORS["error"]
        else:
            mic_text = "Микрофон: проверка…"
            mic_fg = COLORS["muted"]
        self.mic_lbl.config(text=mic_text, fg=mic_fg)

        level = max(0.0, min(1.0, float(snap["mic_level"])))
        w = self.level_canvas.winfo_width() or 300
        self.level_canvas.coords(self._level_bar, 0, 0, int(w * level), 14)
        bar_color = COLORS["listen"] if level > 0.02 else COLORS["muted"]
        if state == "error":
            bar_color = COLORS["error"]
        self.level_canvas.itemconfig(self._level_bar, fill=bar_color)

        self.heard_lbl.config(text=snap["heard"] or "—")
        self.cmd_lbl.config(text=snap["command"] or "—")
        reply = snap["reply"] or "—"
        if len(reply) > 280:
            reply = reply[:277] + "…"
        self.reply_lbl.config(text=reply)

        self._root.after(80, self._tick)

    def stop(self) -> None:
        if self._root:
            try:
                self._root.after(0, self._root.destroy)
            except Exception:
                pass
