"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Drive from "../components/Drive";
import {
  createDocument,
  deleteDocument,
  emptyTrash,
  getDocument,
  listDocuments,
  restoreDocument,
  storageUsageBytes,
  trashDocument,
  updateDocument,
  UNTITLED,
  type StoredDocument,
} from "../lib/documents";
import { getTemplate } from "../lib/templates";
import { useTheme } from "../lib/useTheme";

export default function DrivePage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [storageBytes, setStorageBytes] = useState(0);

  // Pull the latest list + storage usage from Supabase into state. Kept in
  // state (rather than read during render) so the server and first client
  // render agree — both start empty, then this fills in after the queries
  // resolve.
  async function refresh() {
    const [docs, bytes] = await Promise.all([
      listDocuments(),
      storageUsageBytes(),
    ]);
    setDocuments(docs);
    setStorageBytes(bytes);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // If a guest just signed in, turn their stashed draft into a real,
      // saved document and open it — so they continue in the same doc.
      let raw: string | null = null;
      try {
        raw = sessionStorage.getItem("musedoc.pendingDraft");
      } catch {
        raw = null;
      }
      if (raw) {
        try {
          sessionStorage.removeItem("musedoc.pendingDraft");
        } catch {}
        try {
          const draft = JSON.parse(raw) as {
            title?: string;
            html?: string;
            text?: string;
          };
          const created = await createDocument(draft.title, draft.html);
          if (created) {
            await updateDocument(created.id, { text: draft.text ?? "" });
            if (!cancelled) router.replace(`/doc/${created.id}`);
            return;
          }
        } catch {
          // Fall through to the normal Drive view.
        }
      }
      if (!cancelled) await refresh();
    })();
    return () => {
      cancelled = true;
    };
    // Run once on mount. refresh/createDocument/router are stable for this view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(templateId?: string) {
    const template = templateId ? getTemplate(templateId) : undefined;
    const doc = template
      ? await createDocument(template.title, template.html)
      : await createDocument();
    if (doc) router.push(`/doc/${doc.id}`);
  }

  async function handleRename(id: string, title: string) {
    await updateDocument(id, { title });
    await refresh();
  }

  async function handleToggleStar(id: string) {
    const doc = await getDocument(id);
    if (!doc) return;
    await updateDocument(id, { starred: !doc.starred });
    await refresh();
  }

  async function handleTrash(id: string) {
    await trashDocument(id);
    await refresh();
  }

  async function handleRestore(id: string) {
    await restoreDocument(id);
    await refresh();
  }

  async function handleDeleteForever(id: string) {
    const name = documents.find((d) => d.id === id)?.title.trim() || UNTITLED;
    if (
      !window.confirm(`Permanently delete "${name}"? This can't be undone.`)
    ) {
      return;
    }
    await deleteDocument(id);
    await refresh();
  }

  async function handleEmptyTrash() {
    const count = documents.filter((d) => d.trashedAt !== null).length;
    if (count === 0) return;
    if (
      !window.confirm(
        `Permanently delete ${count} document${
          count === 1 ? "" : "s"
        } in Trash? This can't be undone.`
      )
    ) {
      return;
    }
    await emptyTrash();
    await refresh();
  }

  return (
    <Drive
      documents={documents}
      storageBytes={storageBytes}
      onOpen={(id) => router.push(`/doc/${id}`)}
      onCreate={handleCreate}
      onRename={handleRename}
      onToggleStar={handleToggleStar}
      onTrash={handleTrash}
      onRestore={handleRestore}
      onDeleteForever={handleDeleteForever}
      onEmptyTrash={handleEmptyTrash}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );
}
