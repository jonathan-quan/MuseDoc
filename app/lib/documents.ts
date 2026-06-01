// Document persistence backed by Supabase (Postgres + Row Level Security).
//
// Every document and chat is scoped to the signed-in user by RLS, so these
// queries never need to send a user id — `user_id` defaults to auth.uid() on
// insert and the policies enforce ownership on read/write. See supabase/
// schema.sql for the table + policy definitions.
//
// All data calls are async (they hit the network). The store still exposes the
// editor's HTML (which round-trips faithfully through Tiptap's setContent/
// getHTML) plus a plain-text snapshot used for Drive previews and search.
import { createClient } from "./supabase/client";

const supabase = createClient();

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

export const UNTITLED = "Untitled document";

// The columns we select, and the row shape Postgres returns. Timestamps come
// back as ISO strings; the app works in epoch millis, so we convert in `toDoc`.
const COLUMNS = "id,title,html,text,starred,trashed_at,created_at,updated_at";

type DocumentRow = {
  id: string;
  title: string;
  html: string;
  text: string;
  starred: boolean;
  trashed_at: string | null;
  created_at: string;
  updated_at: string;
};

function toDoc(row: DocumentRow): StoredDocument {
  return {
    id: row.id,
    title: row.title,
    html: row.html,
    text: row.text,
    starred: row.starred,
    trashedAt: row.trashed_at ? new Date(row.trashed_at).getTime() : null,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

/** All of the signed-in user's documents, most recently updated first. */
export async function listDocuments(): Promise<StoredDocument[]> {
  const { data, error } = await supabase
    .from("documents")
    .select(COLUMNS)
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data.map(toDoc);
}

export async function getDocument(id: string): Promise<StoredDocument | null> {
  const { data } = await supabase
    .from("documents")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  return data ? toDoc(data) : null;
}

export async function createDocument(
  title = UNTITLED,
  html = "<p></p>"
): Promise<StoredDocument | null> {
  const { data } = await supabase
    .from("documents")
    .insert({ title, html })
    .select(COLUMNS)
    .single();
  return data ? toDoc(data) : null;
}

/**
 * Persist edits to an existing document. Only the provided fields change; the
 * `updated_at` timestamp is always refreshed. Returns the saved document, or
 * null if no document with that id exists (or it isn't the caller's).
 */
export async function updateDocument(
  id: string,
  changes: Partial<Pick<StoredDocument, "title" | "html" | "text" | "starred">>
): Promise<StoredDocument | null> {
  const { data } = await supabase
    .from("documents")
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();
  return data ? toDoc(data) : null;
}

/** Move a document to Trash. Kept in storage (can be restored) and, like the
 * old store, this deliberately does NOT bump `updated_at`. */
export async function trashDocument(id: string): Promise<void> {
  await supabase
    .from("documents")
    .update({ trashed_at: new Date().toISOString() })
    .eq("id", id);
}

/** Move a document out of Trash, back to the active list. */
export async function restoreDocument(id: string): Promise<void> {
  await supabase.from("documents").update({ trashed_at: null }).eq("id", id);
}

/** Permanently remove a single document (its chat cascades away in the DB). */
export async function deleteDocument(id: string): Promise<void> {
  await supabase.from("documents").delete().eq("id", id);
}

/** Permanently remove every trashed document (chats cascade away). */
export async function emptyTrash(): Promise<void> {
  await supabase.from("documents").delete().not("trashed_at", "is", null);
}

/** Approximate bytes used by the user's documents (for the Storage meter). */
export async function storageUsageBytes(): Promise<number> {
  const { data } = await supabase.from("documents").select("html,text");
  if (!data) return 0;
  return data.reduce(
    (sum, d) =>
      sum +
      new Blob([d.html ?? ""]).size +
      new Blob([d.text ?? ""]).size,
    0
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Per-document chat history ──────────────────────────────────────────────
// Stored in its own table (keyed by document id) so a conversation survives
// navigating away and back, without bloating the document's autosave path.

export type StoredChatMessage = {
  role: "user" | "assistant";
  content: string;
  requestType?: string;
};

/** The saved conversation for a document, or null if none has been saved. */
export async function loadChat(
  id: string
): Promise<StoredChatMessage[] | null> {
  const { data } = await supabase
    .from("document_chats")
    .select("messages")
    .eq("document_id", id)
    .maybeSingle();
  return data && Array.isArray(data.messages)
    ? (data.messages as StoredChatMessage[])
    : null;
}

export async function saveChat(
  id: string,
  messages: StoredChatMessage[]
): Promise<void> {
  await supabase
    .from("document_chats")
    .upsert(
      { document_id: id, messages, updated_at: new Date().toISOString() },
      { onConflict: "document_id" }
    );
}

export async function deleteChat(id: string): Promise<void> {
  await supabase.from("document_chats").delete().eq("document_id", id);
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
