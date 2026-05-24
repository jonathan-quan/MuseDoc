"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  Mic,
  Paperclip,
  SendHorizontal,
  Square,
  X,
} from "lucide-react";
import Editor, {
  type AssistantEditorAction,
  type EditorHandle,
} from "./components/Editor";

type ChatMessage = { role: "user" | "assistant"; content: string };
type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  kind: "text" | "image" | "unsupported";
};
type OpenAIModel = "gpt-5.5" | "gpt-5.4" | "gpt-5.3-chat-latest" | "gpt-5.2";
type TextRange = { from: number; to: number };
type RequestType =
  | "q_and_a"
  | "edit"
  | "draft"
  | "summarize"
  | "reason"
  | "tool_action";
type PendingReview = {
  original: string;
  replacement: string;
  range: TextRange | null;
};

const modelOptions: { label: string; value: OpenAIModel }[] = [
  { label: "GPT-5.5", value: "gpt-5.5" },
  { label: "GPT-5.4", value: "gpt-5.4" },
  { label: "GPT-5.3 Chat", value: "gpt-5.3-chat-latest" },
  { label: "GPT-5.2", value: "gpt-5.2" },
];

const initialMessages: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "Ask me anything about the current document, or tell me what to draft, rewrite, edit, summarize, or reason through.",
  },
];

function tokenizeText(text: string) {
  return text.match(/\s+|[^\s]+/g) ?? [];
}

function diffTokens(original: string, next: string) {
  const a = tokenizeText(original);
  const b = tokenizeText(next);
  const dp = Array.from({ length: a.length + 1 }, () =>
    Array<number>(b.length + 1).fill(0)
  );

  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      dp[i][j] =
        a[i] === b[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const parts: { type: "equal" | "delete" | "insert"; text: string }[] = [];
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      parts.push({ type: "equal", text: a[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      parts.push({ type: "delete", text: a[i] });
      i += 1;
    } else {
      parts.push({ type: "insert", text: b[j] });
      j += 1;
    }
  }

  while (i < a.length) {
    parts.push({ type: "delete", text: a[i] });
    i += 1;
  }
  while (j < b.length) {
    parts.push({ type: "insert", text: b[j] });
    j += 1;
  }

  return parts;
}

function DiffText({
  parts,
  side,
}: {
  parts: ReturnType<typeof diffTokens>;
  side: "original" | "proposed";
}) {
  return (
    <p className="whitespace-pre-wrap text-sm leading-7 text-gray-800">
      {parts.map((part, index) => {
        if (part.type === "insert" && side === "original") return null;
        if (part.type === "delete" && side === "proposed") return null;
        if (part.type === "delete") {
          return (
            <mark
              key={index}
              className="rounded bg-red-100 px-0.5 text-red-800 line-through decoration-red-500"
            >
              {part.text}
            </mark>
          );
        }
        if (part.type === "insert") {
          return (
            <mark
              key={index}
              className="rounded bg-green-100 px-0.5 text-green-900"
            >
              {part.text}
            </mark>
          );
        }
        return <span key={index}>{part.text}</span>;
      })}
    </p>
  );
}

function readFile(file: File): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        content: result,
        kind: file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("text/") ||
            /\.(md|txt|json|csv|ts|tsx|js|jsx|css|html)$/i.test(file.name)
          ? "text"
          : "unsupported",
      });
    };

    if (file.type.startsWith("image/")) reader.readAsDataURL(file);
    else reader.readAsText(file);
  });
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [model, setModel] = useState<OpenAIModel>("gpt-5.5");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [documentContext, setDocumentContext] = useState({
    text: "",
    html: "",
    selectionText: "",
    currentBlockText: "",
    targetRange: null as TextRange | null,
  });
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [chatWidth, setChatWidth] = useState(384);

  function startResize(e: ReactMouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = chatWidth;
    const rect = containerRef.current?.getBoundingClientRect();
    const maxWidth = rect ? rect.width - 420 : 900;
    const move = (ev: MouseEvent) => {
      const delta = startX - ev.clientX;
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

  async function addFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;

    try {
      const next = await Promise.all(files.map(readFile));
      setAttachments((prev) => [...prev, ...next]);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not read file.");
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || isSending) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);
    setStatus(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: nextMessages,
          document: documentContext,
          attachments,
        }),
      });
      const payload = (await response.json()) as {
        requestType?: RequestType;
        message?: string;
        edit?: { replacement?: string };
        actions?: AssistantEditorAction[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "OpenAI request failed.");
      const hasEdit =
        payload.requestType === "edit" && Boolean(payload.edit?.replacement);
      const actions =
        payload.requestType === "tool_action" ? payload.actions ?? [] : [];
      if (payload.edit?.replacement) {
        const original =
          documentContext.selectionText.trim() ||
          documentContext.currentBlockText.trim();
        setPendingReview({
          original,
          replacement: payload.edit.replacement,
          range: documentContext.targetRange,
        });
      }
      if (actions.length > 0 && !hasEdit) {
        editorRef.current?.applyAssistantActions(actions);
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: hasEdit
            ? "I prepared a suggested edit. Review it in the editor."
            : actions.length > 0
            ? payload.message ?? "I used the editor tools for that."
            : payload.message ?? "",
        },
      ]);
      setAttachments([]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not send message.";
      setStatus(message);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `I could not respond: ${message}` },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function acceptReview() {
    if (!pendingReview) return;
    if (pendingReview.range) {
      editorRef.current?.replaceRange(pendingReview.range, pendingReview.replacement);
    } else {
      editorRef.current?.replaceSelectionOrCurrentBlock(
        pendingReview.replacement
      );
    }
    setPendingReview(null);
  }

  function rejectReview() {
    setPendingReview(null);
  }

  const reviewDiff = pendingReview
    ? diffTokens(pendingReview.original, pendingReview.replacement)
    : [];

  async function toggleRecording() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Voice recording is not available in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audio = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const form = new FormData();
        form.append("audio", audio, "voice.webm");
        setStatus("Transcribing voice...");
        try {
          const response = await fetch("/api/transcribe", {
            method: "POST",
            body: form,
          });
          const payload = (await response.json()) as {
            text?: string;
            error?: string;
          };
          if (!response.ok) {
            throw new Error(payload.error ?? "Transcription failed.");
          }
          setInput((prev) =>
            [prev.trim(), payload.text?.trim()].filter(Boolean).join(" ")
          );
          setStatus(null);
        } catch (error) {
          setStatus(
            error instanceof Error ? error.message : "Could not transcribe voice."
          );
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setStatus("Recording...");
    } catch {
      setStatus("Microphone permission was not granted.");
    }
  }

  return (
    <div className="flex h-full flex-col">
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

      <main ref={containerRef} className="flex min-h-0 flex-1">
        <section className="relative flex min-w-0 flex-1 flex-col bg-white">
          <Editor ref={editorRef} onDocumentChange={setDocumentContext} />
          {pendingReview && (
            <div className="absolute inset-0 z-30 flex flex-col bg-white">
              <div className="flex shrink-0 items-center justify-between gap-4 border-b border-gray-200 px-5 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    Review suggested edit
                  </h2>
                  <p className="text-xs text-gray-500">
                    Compare the current text with the assistant&apos;s version.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={rejectReview}
                    className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={acceptReview}
                    className="h-9 rounded-md bg-gray-900 px-3 text-sm font-medium text-white hover:bg-gray-800"
                  >
                    Accept
                  </button>
                </div>
              </div>
              <div className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-gray-200 overflow-hidden lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                <section className="flex min-h-0 flex-col">
                  <div className="shrink-0 border-b border-gray-200 bg-red-50 px-4 py-2 text-xs font-semibold uppercase text-red-700">
                    Original
                  </div>
                  <div className="min-h-0 flex-1 overflow-auto p-5">
                    <DiffText parts={reviewDiff} side="original" />
                  </div>
                </section>
                <section className="flex min-h-0 flex-col">
                  <div className="shrink-0 border-b border-gray-200 bg-green-50 px-4 py-2 text-xs font-semibold uppercase text-green-700">
                    Proposed
                  </div>
                  <div className="min-h-0 flex-1 overflow-auto p-5">
                    <DiffText parts={reviewDiff} side="proposed" />
                  </div>
                </section>
              </div>
            </div>
          )}
        </section>

        <div
          role="separator"
          aria-orientation="vertical"
          title="Drag to resize"
          onMouseDown={startResize}
          className="w-1.5 shrink-0 cursor-col-resize bg-gray-200 transition-colors hover:bg-blue-400"
        />

        <aside
          style={{ width: chatWidth }}
          className="flex shrink-0 flex-col bg-gray-50"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
            <span className="text-sm font-semibold text-gray-900">Assistant</span>
          </div>

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
                      ? "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-gray-900 px-3.5 py-2 text-sm text-white"
                      : "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-white px-3.5 py-2 text-sm text-gray-800 shadow-sm ring-1 ring-gray-200"
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="text-xs font-medium text-gray-400">Thinking...</div>
            )}
          </div>

          <div className="shrink-0 border-t border-gray-200 bg-gray-50 p-3">
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {attachments.map((file) => (
                  <span
                    key={file.id}
                    className="flex max-w-full items-center gap-1 rounded-full border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600"
                    title={file.name}
                  >
                    <span className="max-w-36 truncate">{file.name}</span>
                    <button
                      type="button"
                      title="Remove file"
                      onClick={() =>
                        setAttachments((prev) =>
                          prev.filter((item) => item.id !== file.id)
                        )
                      }
                      className="text-gray-400 hover:text-gray-700"
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {status && <div className="mb-2 text-xs text-gray-500">{status}</div>}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={addFiles}
              className="hidden"
            />

            <div className="rounded-[1.35rem] border border-gray-300 bg-white px-3 py-2 shadow-sm focus-within:border-gray-400 focus-within:shadow">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
                rows={2}
                placeholder="Ask the assistant..."
                className="max-h-32 min-h-12 w-full resize-none bg-transparent px-1 py-1 text-sm text-gray-800 outline-none placeholder:text-gray-400"
              />
              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  title="Attach files"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                >
                  <Paperclip size={17} />
                </button>
                <button
                  type="button"
                  title={isRecording ? "Stop recording" : "Record voice"}
                  onClick={toggleRecording}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    isRecording
                      ? "bg-red-50 text-red-600"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  }`}
                >
                  {isRecording ? <Square size={15} /> : <Mic size={17} />}
                </button>
                <select
                  aria-label="OpenAI model"
                  value={model}
                  onChange={(e) => setModel(e.target.value as OpenAIModel)}
                  className="h-8 min-w-0 rounded-full border border-transparent bg-transparent px-2 text-xs font-medium text-gray-600 outline-none hover:bg-gray-100"
                >
                  {modelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="hidden text-xs text-gray-400 sm:inline">
                  OpenAI
                </span>
                {documentContext.selectionText.trim() && (
                  <span
                    className="hidden max-w-24 truncate text-xs font-medium text-gray-400 md:inline"
                    title="Selected text will be used first"
                  >
                    Selection
                  </span>
                )}
                <button
                  type="button"
                  title="Send"
                  onClick={() => void sendMessage()}
                  disabled={!input.trim() || isSending}
                  className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <SendHorizontal size={17} />
                </button>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
