// Client-side document persistence backed by localStorage.
//
// MuseDoc has no backend or accounts yet, so every document lives in the
// browser. A document stores the editor's HTML (which round-trips faithfully
// through Tiptap's setContent/getHTML, including table classes) plus a little
// metadata used by the Drive home screen.

export type StoredDocument = {
  id: string;
  title: string;
  /** Editor HTML — what we feed back into the editor when reopening. */
  html: string;
  /** Plain-text snapshot, used for previews and search. */
  text: string;
  starred: boolean;
  /** Timestamp the document was moved to Trash, or null if it's active. */
  trashedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = "musedoc-documents";

export const UNTITLED = "Untitled document";

function isBrowser() {
  return typeof window !== "undefined";
}

function createId() {
  if (isBrowser() && "randomUUID" in crypto) return crypto.randomUUID();
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readAll(): StoredDocument[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (doc): doc is StoredDocument =>
        doc && typeof doc.id === "string" && typeof doc.html === "string"
    );
  } catch {
    return [];
  }
}

function writeAll(docs: StoredDocument[]) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  } catch {
    // Quota exceeded or storage unavailable — nothing we can do client-side.
  }
}

/** All documents, most recently updated first. */
export function listDocuments(): StoredDocument[] {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getDocument(id: string): StoredDocument | null {
  return readAll().find((doc) => doc.id === id) ?? null;
}

export function createDocument(title = UNTITLED, html = "<p></p>"): StoredDocument {
  const now = Date.now();
  const doc: StoredDocument = {
    id: createId(),
    title,
    html,
    text: "",
    starred: false,
    trashedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  writeAll([doc, ...readAll()]);
  return doc;
}

/**
 * Persist edits to an existing document. Only the provided fields change; the
 * `updatedAt` timestamp is always refreshed. Returns the saved document, or
 * null if no document with that id exists.
 */
export function updateDocument(
  id: string,
  changes: Partial<Pick<StoredDocument, "title" | "html" | "text" | "starred">>
): StoredDocument | null {
  const docs = readAll();
  const index = docs.findIndex((doc) => doc.id === id);
  if (index === -1) return null;
  const next: StoredDocument = {
    ...docs[index],
    ...changes,
    updatedAt: Date.now(),
  };
  docs[index] = next;
  writeAll(docs);
  return next;
}

// Patch a single field without touching `updatedAt` (used for Trash/restore so
// the document keeps its real last-edited time).
function patch(id: string, changes: Partial<StoredDocument>) {
  const docs = readAll();
  const index = docs.findIndex((doc) => doc.id === id);
  if (index === -1) return;
  docs[index] = { ...docs[index], ...changes };
  writeAll(docs);
}

/** Move a document to Trash. It's kept in storage and can be restored. */
export function trashDocument(id: string) {
  patch(id, { trashedAt: Date.now() });
}

/** Move a document out of Trash, back to the active list. */
export function restoreDocument(id: string) {
  patch(id, { trashedAt: null });
}

/** Permanently remove a single document (and its saved chat). */
export function deleteDocument(id: string) {
  writeAll(readAll().filter((doc) => doc.id !== id));
  deleteChat(id);
}

/** Permanently remove every trashed document (and their chats). */
export function emptyTrash() {
  const all = readAll();
  all.filter((doc) => doc.trashedAt).forEach((doc) => deleteChat(doc.id));
  writeAll(all.filter((doc) => !doc.trashedAt));
}

/** Approximate bytes used by the stored documents (for the Storage meter). */
export function storageUsageBytes(): number {
  if (!isBrowser()) return 0;
  try {
    return new Blob([window.localStorage.getItem(STORAGE_KEY) ?? ""]).size;
  } catch {
    return 0;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Per-document chat history ──────────────────────────────────────────────
// Stored separately from the documents themselves (keyed by document id) so a
// conversation survives navigating away and back, without bloating each
// document record or its autosave path.

export type StoredChatMessage = {
  role: "user" | "assistant";
  content: string;
  requestType?: string;
};

const CHAT_KEY = "musedoc-chats";

function readChats(): Record<string, StoredChatMessage[]> {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(CHAT_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeChats(chats: Record<string, StoredChatMessage[]>) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(CHAT_KEY, JSON.stringify(chats));
  } catch {
    // Storage full/unavailable — chat history is best-effort.
  }
}

/** The saved conversation for a document, or null if none has been saved. */
export function loadChat(id: string): StoredChatMessage[] | null {
  const chats = readChats();
  return Array.isArray(chats[id]) ? chats[id] : null;
}

export function saveChat(id: string, messages: StoredChatMessage[]) {
  const chats = readChats();
  chats[id] = messages;
  writeChats(chats);
}

export function deleteChat(id: string) {
  const chats = readChats();
  if (id in chats) {
    delete chats[id];
    writeChats(chats);
  }
}

/** Human-friendly "opened" label like Drive ("May 25", "2:14 PM", "Yesterday"). */
export function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}
