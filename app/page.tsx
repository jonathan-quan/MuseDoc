"use client";

import { useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import Editor from "./components/Editor";

type ChatMessage = { role: "user" | "assistant"; content: string };

const initialMessages: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "Hi! I'm your writing assistant. Select text in the editor and ask me to rewrite, adjust the tone, or continue it — or just ask a question about your document.",
  },
];

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");

  // Resizable split between the editor (left) and chat panel (right).
  const containerRef = useRef<HTMLDivElement>(null);
  const [chatWidth, setChatWidth] = useState(384);

  function startResize(e: ReactMouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = chatWidth;
    const rect = containerRef.current?.getBoundingClientRect();
    const maxWidth = rect ? rect.width - 420 : 900;
    const move = (ev: MouseEvent) => {
      const delta = startX - ev.clientX; // drag left → wider chat
      setChatWidth(Math.min(Math.max(startWidth + delta, 300), maxWidth));
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      {
        role: "assistant",
        content:
          "(Mock reply) Once the Claude API is connected, I'll respond here using your document as context.",
      },
    ]);
    setInput("");
  }

  return (
    <div className="flex h-full flex-col">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight text-gray-900">
            MuseDoc
          </span>
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-500">
            draft
          </span>
        </div>
        <input
          aria-label="Document title"
          defaultValue="Untitled document"
          className="w-64 rounded-md px-2 py-1 text-center text-sm text-gray-600 outline-none hover:bg-gray-50 focus:bg-gray-50"
        />
      </header>

      {/* ── Main: editor (flexible) + draggable divider + chat ─ */}
      <main ref={containerRef} className="flex min-h-0 flex-1">
        {/* Editor pane */}
        <section className="flex min-w-0 flex-1 flex-col bg-white">
          <Editor />
        </section>

        {/* Drag handle to resize the panes */}
        <div
          role="separator"
          aria-orientation="vertical"
          title="Drag to resize"
          onMouseDown={startResize}
          className="w-1.5 shrink-0 cursor-col-resize bg-gray-200 transition-colors hover:bg-blue-400"
        />

        {/* Chat panel */}
        <aside
          style={{ width: chatWidth }}
          className="flex shrink-0 flex-col bg-gray-50"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
            <span className="text-sm font-semibold text-gray-900">Assistant</span>
            <span className="text-xs text-gray-400">mock</span>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user" ? "flex justify-end" : "flex justify-start"
                }
              >
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-gray-900 px-3.5 py-2 text-sm text-white"
                      : "max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-3.5 py-2 text-sm text-gray-800 shadow-sm ring-1 ring-gray-200"
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-gray-200 bg-gray-50 p-3">
            <div className="flex items-end gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 focus-within:border-gray-400">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                rows={1}
                placeholder="Ask the assistant…"
                className="max-h-32 flex-1 resize-none bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
