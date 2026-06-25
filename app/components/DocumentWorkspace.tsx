"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
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
  uploadImage,
  UNTITLED,
  type StoredDocument,
} from "../lib/documents";
import { useTheme } from "../lib/useTheme";
import UserMenu from "./UserMenu";
import AuthDialog from "./AuthDialog";

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

const modelOptions: {
  label: string;
  value: OpenAIModel;
}[] = [
  { label: "GPT-5.4 Mini", value: "gpt-5.4-mini" },
  { label: "GPT-5.4", value: "gpt-5.4" },
  { label: "GPT-5.5", value: "gpt-5.5" },
  { label: "GPT-5.5 Pro", value: "gpt-5.5-pro" },
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
                  {active && (
                    <Check size={16} className="shrink-0 text-gray-900 dark:text-gray-100" />
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

const initialMessages: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "Ask me anything about the current document, or tell me what to draft, rewrite, edit, summarize, or reason through.",
  },
];

const MAX_TEXT_ATTACHMENT_BYTES = 1 * 1024 * 1024;
const MAX_IMAGE_ATTACHMENT_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 6 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function attachmentKind(file: File): Attachment["kind"] {
  if (file.type.startsWith("image/")) return "image";
  if (
    file.type.startsWith("text/") ||
    /\.(md|txt|json|csv|ts|tsx|js|jsx|css|html)$/i.test(file.name)
  ) {
    return "text";
  }
  return "unsupported";
}

function readFile(file: File): Promise<Attachment> {
  const kind = attachmentKind(file);
  const limit =
    kind === "image" ? MAX_IMAGE_ATTACHMENT_BYTES : MAX_TEXT_ATTACHMENT_BYTES;
  if (kind !== "unsupported" && file.size > limit) {
    return Promise.reject(
      new Error(`${file.name} is larger than ${formatBytes(limit)}.`)
    );
  }
  if (kind === "unsupported") {
    return Promise.resolve({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      content: "",
      kind,
    });
  }

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
        kind,
      });
    };

    if (kind === "image") reader.readAsDataURL(file);
    else reader.readAsText(file);
  });
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
  const [reviewing, setReviewing] = useState(false);
  // HTML captured just before applying a non-diff action, so rejecting it can
  // restore the document. Null while a diff-style edit (green/red marks) is the
  // thing under review — those revert via the editor's diff handling instead.
  const reviewSnapshotRef = useRef<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  // Typewriter state: streams the latest assistant reply into its bubble word
  // by word (like ChatGPT) instead of showing it all at once. `index` is the
  // message being revealed, `words` keeps whitespace tokens so spacing is
  // preserved, and `shown` is how many tokens are currently visible.
  const [stream, setStream] = useState<{ index: number; words: string[] } | null>(
    null
  );
  const [shown, setShown] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  // Autosave indicator shown in the header. null until the first save runs.
  const [saveState, setSaveState] = useState<"saving" | "saved" | "error" | null>(
    null
  );
  const [chatOpen, setChatOpen] = useState(true);
  // Guests can open the editor but must sign in to use the AI; this shows the
  // auth modal when they try.
  const [showAuth, setShowAuth] = useState(false);

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
    // Also pause while an inline edit diff is under review, so the temporary
    // green/red diff markup is never persisted.
    if (guest || reviewing || !doc || !docId || !documentContext.html) return;
    let cancelled = false;
    const savingTimer = window.setTimeout(() => {
      if (!cancelled) setSaveState("saving");
    }, 0);
    const timer = window.setTimeout(async () => {
      if (!cancelled) setSaveState("saving");
      try {
        const saved = await updateDocument(docId, {
          title: title.trim() || UNTITLED,
          html: documentContext.html,
          text: documentContext.text,
        });
        // A newer edit (or unmount) supersedes this write — don't let its
        // result overwrite the fresher status.
        if (!cancelled) setSaveState(saved ? "saved" : "error");
      } catch {
        // A thrown save must still resolve the indicator — never leave it
        // stuck on "Saving…".
        if (!cancelled) setSaveState("error");
      }
    }, 600);
    return () => {
      cancelled = true;
      window.clearTimeout(savingTimer);
      window.clearTimeout(timer);
    };
  }, [
    guest,
    reviewing,
    doc,
    docId,
    title,
    documentContext.html,
    documentContext.text,
  ]);

  // Advance the typewriter one word at a time while a reply is streaming.
  // Clears `stream` once every token is visible so the bubble falls back to its
  // stored full content.
  useEffect(() => {
    if (!stream) return;
    const timer = window.setTimeout(() => {
      if (shown >= stream.words.length) setStream(null);
      else setShown((n) => n + 1);
    }, shown >= stream.words.length ? 0 : 28);
    return () => window.clearTimeout(timer);
  }, [stream, shown]);

  // Begin streaming an assistant reply into a freshly appended message.
  function streamAssistant(index: number, content: string) {
    // Split on whitespace but keep the separators so spacing/newlines survive.
    setStream({ index, words: content.split(/(\s+)/) });
    setShown(0);
  }

  async function backToDrive() {
    // Guests have no Drive — send them back to the landing page.
    if (guest) {
      router.push("/");
      return;
    }
    // Flush any pending edits immediately so the Drive preview is current. Gated
    // on documentContext.html for the same reason as the autosave effect above:
    // don't flush an empty snapshot before the editor has reported its content.
    if (!reviewing && docId && doc && documentContext.html) {
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
      const currentSize = attachments.reduce((sum, file) => sum + file.size, 0);
      const nextSize = next.reduce((sum, file) => sum + file.size, 0);
      if (currentSize + nextSize > MAX_TOTAL_ATTACHMENT_BYTES) {
        throw new Error(
          `Attachments can total up to ${formatBytes(
            MAX_TOTAL_ATTACHMENT_BYTES
          )}.`
        );
      }
      setAttachments((prev) => [...prev, ...next]);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not read file.");
    }
  }

  // Save the guest's current work so it can become a real document right after
  // they sign in (survives the Google OAuth redirect via sessionStorage).
  function stashGuestDraft() {
    try {
      sessionStorage.setItem(
        "musedoc.pendingDraft",
        JSON.stringify({
          title: title.trim() || UNTITLED,
          html: documentContext.html || doc?.html || "<p></p>",
          text: documentContext.text || "",
        })
      );
    } catch {
      // sessionStorage unavailable — fall back to a fresh doc after sign-in.
    }
  }

  async function sendMessage(override?: string) {
    const text = (override ?? input).trim();
    if (!text || isSending) return;
    if (guest) {
      stashGuestDraft();
      setShowAuth(true);
      return;
    }

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
        documentEdit?: { replace?: string };
        actions?: AssistantEditorAction[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "OpenAI request failed.");
      const editFind = payload.edit?.find;
      const hasEdit =
        payload.requestType === "edit" &&
        typeof editFind === "string" &&
        editFind.length > 0;
      const docReplace = payload.documentEdit?.replace;
      const hasDocEdit =
        payload.requestType === "edit" &&
        typeof docReplace === "string" &&
        docReplace.trim().length > 0;
      const actions =
        payload.requestType === "tool_action" ? payload.actions ?? [] : [];
      let diffShown = false;
      let docReplaced = false;
      if (hasDocEdit && docReplace) {
        // Whole-document edit: show an inline green/red diff across every
        // paragraph when possible, otherwise apply the revision wholesale and
        // review it via a snapshot restore.
        diffShown = editorRef.current?.showDocumentDiff(docReplace) ?? false;
        if (diffShown) {
          reviewSnapshotRef.current = null;
          setReviewing(true);
        } else {
          reviewSnapshotRef.current = editorRef.current?.snapshot() ?? null;
          docReplaced = editorRef.current?.replaceDocument(docReplace) ?? false;
          if (docReplaced) setReviewing(true);
          else reviewSnapshotRef.current = null;
        }
      } else if (hasEdit && editFind) {
        diffShown =
          editorRef.current?.showDiff(editFind, payload.edit?.replace ?? "") ??
          false;
        if (diffShown) {
          reviewSnapshotRef.current = null;
          setReviewing(true);
        }
      }
      let actionsApplied = false;
      if (actions.length > 0 && !hasEdit && !hasDocEdit) {
        // Snapshot the document first so the action can be reverted on reject,
        // then apply it and let the user accept or deny like an inline edit.
        reviewSnapshotRef.current = editorRef.current?.snapshot() ?? null;
        editorRef.current?.applyAssistantActions(actions);
        actionsApplied = true;
        setReviewing(true);
      }
      const replyContent = diffShown
        ? "I marked a suggested edit in the document — review the green/red changes there."
        : docReplaced
        ? payload.message ??
          "I revised the whole document — accept or reject the changes."
        : hasDocEdit
        ? "I couldn't apply that document-wide edit. Try again, or select the section to change."
        : hasEdit
        ? "I couldn't find that exact text to edit. Try selecting it, then ask again."
        : actionsApplied
        ? payload.message ??
          "I applied that to the document — accept or reject it to keep going."
        : payload.message ?? "";
      // The assistant reply lands right after the user message we appended.
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          requestType: payload.requestType,
          content: replyContent,
        },
      ]);
      streamAssistant(nextMessages.length, replyContent);
      setAttachments([]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not send message.";
      setStatus(message);
      const replyContent = `I could not respond: ${message}`;
      setMessages([
        ...nextMessages,
        { role: "assistant", content: replyContent },
      ]);
      streamAssistant(nextMessages.length, replyContent);
    } finally {
      setIsSending(false);
    }
  }

  function acceptReview() {
    // Snapshot present ⇒ an applied action: keeping it just means dropping the
    // snapshot. Otherwise it's an inline diff: bake in the green/red changes.
    if (reviewSnapshotRef.current !== null) {
      reviewSnapshotRef.current = null;
    } else {
      editorRef.current?.acceptDiff();
    }
    setReviewing(false);
  }

  function rejectReview() {
    if (reviewSnapshotRef.current !== null) {
      editorRef.current?.restore(reviewSnapshotRef.current);
      reviewSnapshotRef.current = null;
    } else {
      editorRef.current?.rejectDiff();
    }
    setReviewing(false);
  }

  async function toggleRecording() {
    if (guest) {
      stashGuestDraft();
      setShowAuth(true);
      return;
    }
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
    <div className="paper-ui flex h-full flex-col bg-[var(--paper)] text-[var(--ink)]">
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
          <span className="font-serif text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            MuseDoc
          </span>
          <input
            aria-label="Document title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={UNTITLED}
            className="ml-1 w-64 rounded-md px-2 py-1 text-sm text-gray-600 outline-none hover:bg-gray-50 focus:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800 dark:focus:bg-gray-800"
          />
          {!guest && saveState && (
            <span
              className={`flex items-center gap-1 text-xs ${
                saveState === "error"
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {saveState === "saving"
                ? "Saving…"
                : saveState === "error"
                ? "Couldn't save — check your connection"
                : (
                  <>
                    <Check size={13} /> Saved
                  </>
                )}
            </span>
          )}
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
            // Guests aren't signed in (can't upload), and their scratchpad is
            // never saved — let those images inline. Real docs upload to storage.
            onUploadImage={guest ? undefined : uploadImage}
            // Accepting/rejecting the last change one-by-one ends the review.
            onDiffResolved={() => setReviewing(false)}
          />
          {reviewing && (
            <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--card)] px-2.5 py-2 shadow-lg">
              <button
                type="button"
                onClick={rejectReview}
                title="Reject all changes"
                className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-[var(--line-2)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--ink-soft)] hover:bg-[var(--paper-2)]"
              >
                <X size={14} /> Reject
              </button>
              <button
                type="button"
                onClick={acceptReview}
                title="Accept all changes"
                className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-[var(--on-accent)] hover:opacity-90"
              >
                <Check size={14} /> Accept rewrite
              </button>
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
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
              Assistant
            </span>
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

          <div className="flex-1 space-y-5 overflow-y-auto p-4">
            {messages.map((m, i) => {
              // While a reply is streaming, show only the revealed words for
              // that message; everything else renders its full stored content.
              const streaming = stream !== null && stream.index === i;
              const text = streaming
                ? stream.words.slice(0, shown).join("")
                : m.content;
              if (m.role === "user") {
                return (
                  <div key={`${m.role}-${i}`}>
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-mute)]">
                      You
                    </span>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--ink)]">
                      {text}
                    </p>
                  </div>
                );
              }
              return (
                <div key={`${m.role}-${i}`}>
                  {m.requestType ? (
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
                      MuseDoc · classified as{" "}
                      <span className="italic">{m.requestType}</span>
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-mute)]">
                      MuseDoc
                    </span>
                  )}
                  <div className="mt-1.5 whitespace-pre-wrap rounded-lg border border-[var(--line)] bg-[var(--card)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--ink-soft)]">
                    {text}
                    {streaming && (
                      <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-[var(--ink-mute)]" />
                    )}
                  </div>
                </div>
              );
            })}
            {isSending && !stream && (
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-mute)]">
                Classifying…
              </div>
            )}
          </div>

          <div className="shrink-0 bg-gray-50 p-3 dark:bg-gray-950">
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
                placeholder="Ask, or describe an edit…"
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

      {showAuth && (
        <AuthDialog initialMode="signup" onClose={() => setShowAuth(false)} />
      )}
    </div>
  );
}
