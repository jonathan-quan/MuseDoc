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

  // Pull the latest list + storage usage from localStorage into state. Kept in
  // state (rather than read during render) so the server and first client
  // render agree — both start empty, then this fills in after mount.
  function refresh() {
    setDocuments(listDocuments());
    setStorageBytes(storageUsageBytes());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

  function handleCreate(templateId?: string) {
    const template = templateId ? getTemplate(templateId) : undefined;
    const doc = template
      ? createDocument(template.title, template.html)
      : createDocument();
    router.push(`/doc/${doc.id}`);
  }

  function handleRename(id: string, title: string) {
    updateDocument(id, { title });
    refresh();
  }

  function handleToggleStar(id: string) {
    const doc = getDocument(id);
    if (!doc) return;
    updateDocument(id, { starred: !doc.starred });
    refresh();
  }

  function handleTrash(id: string) {
    trashDocument(id);
    refresh();
  }

  function handleRestore(id: string) {
    restoreDocument(id);
    refresh();
  }

  function handleDeleteForever(id: string) {
    deleteDocument(id);
    refresh();
  }

  function handleEmptyTrash() {
    emptyTrash();
    refresh();
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
