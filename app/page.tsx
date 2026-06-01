"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Drive from "./components/Drive";
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
  type StoredDocument,
} from "./lib/documents";
import { getTemplate } from "./lib/templates";
import { useTheme } from "./lib/useTheme";

export default function Home() {
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
    // refresh() only setState after awaiting the queries, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
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
    await deleteDocument(id);
    await refresh();
  }

  async function handleEmptyTrash() {
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
