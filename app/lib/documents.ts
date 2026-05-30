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

export function createDocument(title = UNTITLED): StoredDocument {
  const now = Date.now();
  const doc: StoredDocument = {
    id: createId(),
    title,
    html: "<p></p>",
    text: "",
    starred: false,
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

export function deleteDocument(id: string) {
  writeAll(readAll().filter((doc) => doc.id !== id));
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
