"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Feather,
  MessageSquare,
  Mic,
  Moon,
  Paperclip,
  SendHorizontal,
  Square,
  Sun,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Editor, {
  type AssistantEditorAction,
  type EditorHandle,
} from "./Editor";
import {
  getDocument,
  loadChat,
  saveChat,
  updateDocument,
  UNTITLED,
  type StoredDocument,
} from "../lib/documents";
import { useTheme } from "../lib/useTheme";
import UserMenu from "./UserMenu";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  requestType?: RequestType;
};
type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  kind: "text" | "image" | "unsupported";
};
type OpenAIModel = "gpt-5.4-mini" | "gpt-5.4" | "gpt-5.5" | "gpt-5.5-pro";
type TextRange = { from: number; to: number };
type RequestType =
  | "q_and_a"
  | "edit"
  | "summarize"
  | "reason"
  | "tool_action";
type PendingReview = {
  // `find` is the exact text located in the document; `replacement` is the
  // new text it will become. `original` is shown in the diff (same as find).
  original: string;
  replacement: string;
  find: string;
};

const modelOptions: {
  label: string;
  value: OpenAIModel;
  descriptor: string;
}[] = [
  { label: "GPT-5.4 Mini", value: "gpt-5.4-mini", descriptor: "Free" },
  { label: "GPT-5.4", value: "gpt-5.4", descriptor: "Plus" },
  { label: "GPT-5.5", value: "gpt-5.5", descriptor: "Plus" },
  { label: "GPT-5.5 Pro", value: "gpt-5.5-pro", descriptor: "Pro" },
];

function ModelPicker({
  model,
  onChange,
}: {
  model: OpenAIModel;
  onChange: (model: OpenAIModel) => void;
}) {
  const [open, setOpen] = useState(false);
  const current =
    modelOptions.find((option) => option.value === model) ?? modelOptions[0];

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="OpenAI model"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 items-center gap-1 rounded-full px-2 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        {current.label}
        <ChevronDown
          size={13}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onMouseDown={() => setOpen(false)}
          />
          <div className="absolute bottom-full left-0 z-50 mb-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            {modelOptions.map((option) => {
              const active = option.value === model;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-6 px-3.5 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <span
                    className={`text-sm ${
                      active
                        ? "font-semibold text-gray-900 dark:text-gray-100"
                        : "font-medium text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {option.label}
                  </span>
                  {active ? (
                    <Check size={16} className="shrink-0 text-gray-900 dark:text-gray-100" />
                  ) : (
                    <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                      {option.descriptor}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const requestTypeLabels: Record<RequestType, string> = {
  q_and_a: "Q&A",
  edit: "Edit",
  summarize: "Summary",
  reason: "Reasoning",
  tool_action: "Action",
};

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
    <p className="whitespace-pre-wrap text-sm leading-7 text-gray-800 dark:text-gray-100">
      {parts.map((part, index) => {
        if (part.type === "insert" && side === "original") return null;
        if (part.type === "delete" && side === "proposed") return null;
        if (part.type === "delete") {
          return (
            <mark
              key={`${index}-del`}
              className="rounded bg-red-100 px-0.5 text-red-800 line-through decoration-red-500 dark:bg-red-500/25 dark:text-red-200"
            >
              {part.text}
            </mark>
          );
        }
        if (part.type === "insert") {
          return (
            <mark
              key={`${index}-ins`}
              className="rounded bg-green-100 px-0.5 text-green-900 dark:bg-green-500/25 dark:text-green-200"
            >
              {part.text}
            </mark>
          );
        }
        return <span key={`${index}-eq`}>{part.text}</span>;
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

/**
 * Suggest a few prompts the user might want to send, based on the current
 * document. Maps the document's section headings to targeted edit prompts
 * ("Polish the education section") and rounds out with general writing help.
 * Returns starter prompts when the document is essentially empty.
 */
function buildSuggestions(html: string, text: string): string[] {
  if (typeof window === "undefined") return [];
  if (text.trim().length < 40) {
    return [
      "Draft an outline for me",
      "Write an introduction",
      "Help me brainstorm ideas",
    ];
  }

  let headings: string[] = [];
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const pick = (selector: string) =>
      Array.from(doc.querySelectorAll(selector))
        .map((el) => (el.textContent ?? "").trim())
        .filter(Boolean);
    headings = pick("h2, h3");
    if (!headings.length) headings = pick("h1");
  } catch {
    headings = [];
  }
  headings = [...new Set(headings)].filter((h) => h.length <= 40);

  const hasBullets = /<li[ >]/i.test(html);
  const out: string[] = [];
  if (headings[0]) out.push(`Polish the ${headings[0].toLowerCase()} section`);
  if (headings[1]) {
    out.push(
      hasBullets
        ? `Strengthen the ${headings[1].toLowerCase()} bullets`
        : `Improve the ${headings[1].toLowerCase()} section`
    );
  }
  out.push("Fix grammar and spelling");
  out.push("Improve the overall flow and clarity");
  return [...new Set(out)].slice(0, 4);
}

export default function DocumentWorkspace({
  docId,
  guest = false,
  autoImport = false,
}: {
  docId?: string;
  /** Guest mode: an in-memory scratch document that is never saved. */
  guest?: boolean;
  /** Open the import picker automatically once the editor mounts. */
  autoImport?: boolean;
}) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [model, setModel] = useState<OpenAIModel>("gpt-5.4-mini");
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
  const [chatOpen, setChatOpen] = useState(true);

  // The document being edited, loaded from Supabase on mount. Held in state
  // (rather than read inline) so the editor mounts only once the HTML is
  // available — see the loading guard before the main render below.
  const [doc, setDoc] = useState<StoredDocument | null>(() =>
    guest
      ? {
          id: "guest",
          title: UNTITLED,
          html: "<p></p>",
          text: "",
          starred: false,
          trashedAt: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
      : null
  );
  const [title, setTitle] = useState(UNTITLED);

  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [chatWidth, setChatWidth] = useState(384);

  // Prompt suggestions tailored to the current document, shown as chips above
  // the chat input until the conversation gets going.
  const suggestions = useMemo(
    () => buildSuggestions(documentContext.html, documentContext.text),
    [documentContext.html, documentContext.text]
  );

  // Load the document for this route from Supabase. If it doesn't exist (bad or
  // stale URL, or not the signed-in user's), send the user back to Drive home.
  // In guest mode there is nothing to load — start a blank in-memory document.
  useEffect(() => {
    // Guest mode initializes its blank document in useState; nothing to load.
    if (guest || !docId) return;
    let cancelled = false;
    (async () => {
      const found = await getDocument(docId);
      if (cancelled) return;
      if (!found) {
        router.replace("/drive");
        return;
      }
      const savedChat = await loadChat(docId);
      if (cancelled) return;
      setDoc(found);
      setTitle(found.title);
      if (savedChat && savedChat.length) setMessages(savedChat as ChatMessage[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [docId, router, guest]);

  // "Import Document" from the landing lands here with autoImport set; open the
  // file picker once the editor (and its hidden input) has mounted.
  useEffect(() => {
    if (!autoImport || !doc) return;
    const timer = window.setTimeout(() => editorRef.current?.openImport(), 150);
    return () => window.clearTimeout(timer);
  }, [autoImport, doc]);

  // Persist the conversation for this document so it survives leaving and
  // returning. Gated on `doc` so we never overwrite a saved chat with the
  // initial greeting before it has loaded.
  useEffect(() => {
    if (guest || !doc || !docId) return;
    void saveChat(docId, messages);
  }, [guest, doc, docId, messages]);

  // Autosave. Debounced so we don't write to the database on every keystroke.
  // Persists the editor's HTML (reloaded on reopen), a plain-text snapshot
  // (used for Drive previews and search), and the current title.
  useEffect(() => {
    // Guests have nothing to save to. Otherwise wait for the editor to report
    // its HTML via a "transaction" event, which doesn't fire until it has
    // mounted. Until then documentContext.html is "" — and an empty editor
    // serializes to "<p></p>", never "" — so a "" here means "not loaded yet".
    // Skip the write so we never overwrite a saved document with nothing.
    if (guest || !doc || !docId || !documentContext.html) return;
    const timer = window.setTimeout(() => {
      void updateDocument(docId, {
        title: title.trim() || UNTITLED,
        html: documentContext.html,
        text: documentContext.text,
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [guest, doc, docId, title, documentContext.html, documentContext.text]);

  async function backToDrive() {
    // Guests have no Drive — send them back to the landing page.
    if (guest) {
      router.push("/");
      return;
    }
    // Flush any pending edits immediately so the Drive preview is current. Gated
    // on documentContext.html for the same reason as the autosave effect above:
    // don't flush an empty snapshot before the editor has reported its content.
    if (docId && doc && documentContext.html) {
      await updateDocument(docId, {
        title: title.trim() || UNTITLED,
        html: documentContext.html,
        text: documentContext.text,
      });
    }
    router.push("/drive");
  }

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

  async function sendMessage(override?: string) {
    const text = (override ?? input).trim();
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
        edit?: { find?: string; replace?: string };
        actions?: AssistantEditorAction[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "OpenAI request failed.");
      const editFind = payload.edit?.find;
      const hasEdit =
        payload.requestType === "edit" &&
        typeof editFind === "string" &&
        editFind.length > 0;
      const actions =
        payload.requestType === "tool_action" ? payload.actions ?? [] : [];
      if (hasEdit && editFind) {
        setPendingReview({
          original: editFind,
          replacement: payload.edit?.replace ?? "",
          find: editFind,
        });
      }
      if (actions.length > 0 && !hasEdit) {
        editorRef.current?.applyAssistantActions(actions);
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          requestType: payload.requestType,
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
    const applied = editorRef.current?.replaceText(
      pendingReview.find,
      pendingReview.replacement
    );
    if (applied === false) {
      setStatus(
        "Couldn't locate the exact text to edit — it may have changed. Try selecting the text, then ask again."
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

  // Wait for the document to load from Supabase before mounting the editor,
  // so it receives the saved HTML as its initial content. (If the document is
  // missing, the load effect has already redirected to the Drive home.)
  if (!doc) {
    return (
      <div className="flex h-full items-center justify-center bg-white text-sm text-gray-400 dark:bg-gray-900 dark:text-gray-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {guest && (
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-blue-600 px-4 py-2 text-center text-sm text-white">
          <span>You&apos;re editing as a guest — your work won&apos;t be saved.</span>
          <button
            type="button"
            onClick={() => router.push("/?login=1")}
            className="rounded-md bg-white/20 px-3 py-1 text-xs font-semibold transition-colors hover:bg-white/30"
          >
            Sign up to save
          </button>
        </div>
      )}
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={backToDrive}
            title="Back to MuseDoc"
            aria-label="Back to MuseDoc"
            className="flex size-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          >
            <ArrowLeft size={18} />
          </button>
          <Feather size={18} className="text-gray-900 dark:text-gray-100" />
          <span className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            MuseDoc
          </span>
          <input
            aria-label="Document title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={UNTITLED}
            className="ml-1 w-64 rounded-md px-2 py-1 text-sm text-gray-600 outline-none hover:bg-gray-50 focus:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800 dark:focus:bg-gray-800"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setChatOpen((v) => !v)}
            title={chatOpen ? "Hide assistant" : "Show assistant"}
            aria-label={chatOpen ? "Hide assistant" : "Show assistant"}
            aria-pressed={chatOpen}
            className={`flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors ${
              chatOpen
                ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
          >
            <MessageSquare size={14} />
            Assistant
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={theme === "dark"}
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle dark mode"
            className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-gray-200 transition-colors dark:bg-gray-700"
          >
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm transition-transform dark:bg-gray-900 dark:text-gray-200 ${
                theme === "dark" ? "translate-x-6" : "translate-x-1"
              }`}
            >
              {theme === "dark" ? <Moon size={12} /> : <Sun size={12} />}
            </span>
          </button>
          {!guest && <UserMenu />}
        </div>
      </header>

      <main ref={containerRef} className="flex min-h-0 flex-1">
        <section className="relative flex min-w-0 flex-1 flex-col bg-white dark:bg-gray-900">
          <Editor
            ref={editorRef}
            initialContent={doc.html}
            onDocumentChange={setDocumentContext}
          />
          {pendingReview && (
            <div className="absolute inset-0 z-30 flex flex-col bg-white dark:bg-gray-900">
              <div className="flex shrink-0 items-center justify-between gap-4 border-b border-gray-200 px-5 py-3 dark:border-gray-800">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Review suggested edit
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Compare the current text with the assistant&apos;s version.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={rejectReview}
                    className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={acceptReview}
                    className="h-9 rounded-md bg-gray-900 px-3 text-sm font-medium text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
                  >
                    Accept
                  </button>
                </div>
              </div>
              <div className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-gray-200 overflow-hidden lg:grid-cols-2 lg:divide-x lg:divide-y-0 dark:divide-gray-800">
                <section className="flex min-h-0 flex-col">
                  <div className="shrink-0 border-b border-gray-200 bg-red-50 px-4 py-2 text-xs font-semibold uppercase text-red-700 dark:border-gray-800 dark:bg-red-950 dark:text-red-300">
                    Original
                  </div>
                  <div className="min-h-0 flex-1 overflow-auto p-5">
                    <DiffText parts={reviewDiff} side="original" />
                  </div>
                </section>
                <section className="flex min-h-0 flex-col">
                  <div className="shrink-0 border-b border-gray-200 bg-green-50 px-4 py-2 text-xs font-semibold uppercase text-green-700 dark:border-gray-800 dark:bg-green-950 dark:text-green-300">
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

        {chatOpen && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize assistant panel"
            tabIndex={0}
            title="Drag to resize"
            onMouseDown={startResize}
            className="w-1.5 shrink-0 cursor-col-resize bg-gray-200 transition-colors hover:bg-blue-400 dark:bg-gray-800 dark:hover:bg-blue-500"
          />
        )}

        <aside
          style={{ width: chatWidth }}
          className={`shrink-0 flex-col bg-gray-50 dark:bg-gray-950 ${
            chatOpen ? "flex" : "hidden"
          }`}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Assistant</span>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              title="Close assistant"
              aria-label="Close assistant"
              className="flex size-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-200 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length <= 1 && suggestions.length > 0 && (
              <div className="flex flex-col items-end gap-3">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void sendMessage(s)}
                    className="max-w-[85%] rounded-xl border border-gray-200 bg-white px-4 py-3 text-right text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-100 dark:hover:bg-gray-800"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {(messages.length > 1 || suggestions.length === 0) &&
              messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={
                  m.role === "user"
                    ? "flex justify-end"
                    : "flex flex-col items-start gap-1"
                }
              >
                {m.role === "assistant" && m.requestType && (
                  <span className="ml-1 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    {requestTypeLabels[m.requestType]}
                  </span>
                )}
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-gray-900 px-3.5 py-2 text-sm text-white dark:bg-gray-200 dark:text-gray-900"
                      : "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-white px-3.5 py-2 text-sm text-gray-800 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700"
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="text-xs font-medium text-gray-400 dark:text-gray-500">Thinking…</div>
            )}
          </div>

          <div className="shrink-0 border-t border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950">
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {attachments.map((file) => (
                  <span
                    key={file.id}
                    className="flex max-w-full items-center gap-1 rounded-full border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
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
                      className="text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200"
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {status && <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">{status}</div>}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              aria-label="Attach files"
              onChange={addFiles}
              className="hidden"
            />

            <div className="rounded-[1.35rem] border border-gray-300 bg-white px-3 py-2 shadow-sm focus-within:border-gray-400 focus-within:shadow dark:border-gray-700 dark:bg-gray-800 dark:focus-within:border-gray-600">
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
                aria-label="Message the assistant"
                className="max-h-32 min-h-12 w-full resize-none bg-transparent p-1 text-sm text-gray-800 outline-none placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  title="Attach files"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                >
                  <Paperclip size={17} />
                </button>
                <button
                  type="button"
                  title={isRecording ? "Stop recording" : "Record voice"}
                  onClick={toggleRecording}
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                    isRecording
                      ? "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                  }`}
                >
                  {isRecording ? <Square size={15} /> : <Mic size={17} />}
                </button>
                <ModelPicker model={model} onChange={setModel} />
                <span className="hidden text-xs text-gray-400 sm:inline dark:text-gray-500">
                  OpenAI
                </span>
                {documentContext.selectionText.trim() && (
                  <span
                    className="hidden max-w-24 truncate text-xs font-medium text-gray-400 md:inline dark:text-gray-500"
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
                  className="ml-auto flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-gray-100 dark:text-gray-900"
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
