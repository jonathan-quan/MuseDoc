"use client";

import { useEffect, useRef, useState } from "react";
import {
  Clock,
  FileText,
  Grid2x2,
  Home,
  HardDrive,
  List as ListIcon,
  Moon,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Star,
  Sun,
  Trash2,
} from "lucide-react";
import {
  formatTimestamp,
  type StoredDocument,
} from "../lib/documents";

type View = "home" | "recent" | "starred" | "trash";

type DriveProps = {
  documents: StoredDocument[];
  onOpen: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onToggleStar: (id: string) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
};

const navItems: { id: View; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "recent", label: "Recent", icon: Clock },
  { id: "starred", label: "Starred", icon: Star },
  { id: "trash", label: "Trash", icon: Trash2 },
];

/** A scaled-down render of the document's HTML, used as a card thumbnail. */
function DocPreview({ html }: { html: string }) {
  return (
    <div className="pointer-events-none h-full w-full overflow-hidden bg-white dark:bg-gray-900">
      <div
        className="origin-top-left scale-[0.32] [&_*]:!text-gray-700 dark:[&_*]:!text-gray-300"
        style={{ width: "312%", padding: "24px 28px" }}
        dangerouslySetInnerHTML={{ __html: html || "<p></p>" }}
      />
    </div>
  );
}

function CardMenu({
  doc,
  onOpen,
  onRename,
  onDelete,
  onToggleStar,
}: {
  doc: StoredDocument;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  onToggleStar: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label="Document options"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-200/70 dark:text-gray-400 dark:hover:bg-gray-700"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            {[
              { label: "Open", icon: FileText, fn: onOpen },
              { label: "Rename", icon: Pencil, fn: onRename },
              {
                label: doc.starred ? "Remove from starred" : "Add to starred",
                icon: Star,
                fn: onToggleStar,
              },
              { label: "Delete", icon: Trash2, fn: onDelete, danger: true },
            ].map(({ label, icon: Icon, fn, danger }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setOpen(false);
                  fn();
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  danger
                    ? "text-red-600 dark:text-red-400"
                    : "text-gray-700 dark:text-gray-200"
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DocCard({
  doc,
  onOpen,
  onRename,
  onDelete,
  onToggleStar,
}: {
  doc: StoredDocument;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  onToggleStar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-left transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="flex items-center gap-2 px-4 py-3">
        <FileText size={18} className="shrink-0 text-blue-600" />
        <span className="flex-1 truncate text-sm font-medium text-gray-800 dark:text-gray-100">
          {doc.title || "Untitled document"}
        </span>
        {doc.starred && (
          <Star size={14} className="shrink-0 fill-amber-400 text-amber-400" />
        )}
        <CardMenu
          doc={doc}
          onOpen={onOpen}
          onRename={onRename}
          onDelete={onDelete}
          onToggleStar={onToggleStar}
        />
      </div>
      <div className="h-44 border-t border-gray-100 dark:border-gray-700">
        <DocPreview html={doc.html} />
      </div>
      <div className="flex items-center gap-2 px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">
        <Clock size={13} />
        Opened {formatTimestamp(doc.updatedAt)}
      </div>
    </button>
  );
}

function DocRow({
  doc,
  onOpen,
  onRename,
  onDelete,
  onToggleStar,
}: {
  doc: StoredDocument;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  onToggleStar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      <FileText size={18} className="shrink-0 text-blue-600" />
      <span className="flex-1 truncate text-sm font-medium text-gray-800 dark:text-gray-100">
        {doc.title || "Untitled document"}
      </span>
      {doc.starred && (
        <Star size={14} className="shrink-0 fill-amber-400 text-amber-400" />
      )}
      <span className="hidden w-32 shrink-0 text-xs text-gray-500 sm:block dark:text-gray-400">
        {formatTimestamp(doc.updatedAt)}
      </span>
      <CardMenu
        doc={doc}
        onOpen={onOpen}
        onRename={onRename}
        onDelete={onDelete}
        onToggleStar={onToggleStar}
      />
    </button>
  );
}

export default function Drive({
  documents,
  onOpen,
  onCreate,
  onRename,
  onDelete,
  onToggleStar,
  theme,
  onToggleTheme,
}: DriveProps) {
  const [view, setView] = useState<View>("home");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
  const [renaming, setRenaming] = useState<StoredDocument | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) renameInputRef.current?.select();
  }, [renaming]);

  const q = query.trim().toLowerCase();
  const visible = documents
    .filter((doc) => (view === "starred" ? doc.starred : true))
    .filter(
      (doc) =>
        !q ||
        doc.title.toLowerCase().includes(q) ||
        doc.text.toLowerCase().includes(q)
    );

  const heading =
    view === "starred"
      ? "Starred"
      : view === "recent"
      ? "Recent"
      : view === "trash"
      ? "Trash"
      : "Welcome to MuseDoc";

  function commitRename(title: string) {
    if (renaming) onRename(renaming.id, title.trim() || "Untitled document");
    setRenaming(null);
  }

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-950">
      {/* Top bar */}
      <header className="flex shrink-0 items-center gap-4 px-4 py-3">
        <div className="flex w-56 items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
            <FileText size={18} />
          </div>
          <span className="text-xl font-medium text-gray-700 dark:text-gray-200">
            MuseDoc
          </span>
        </div>
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search in MuseDoc"
            className="h-12 w-full rounded-full bg-gray-100 pl-12 pr-4 text-sm text-gray-800 outline-none focus:bg-white focus:shadow-md dark:bg-gray-800 dark:text-gray-100 dark:focus:bg-gray-800"
          />
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={theme === "dark"}
          onClick={onToggleTheme}
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
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside className="flex w-56 shrink-0 flex-col gap-1 px-3 py-2">
          <button
            type="button"
            onClick={onCreate}
            className="mb-4 flex w-fit items-center gap-3 rounded-2xl border border-gray-200 bg-white py-3.5 pl-4 pr-6 text-sm font-medium text-gray-700 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <Plus size={20} />
            New
          </button>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={`flex items-center gap-4 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                view === id
                  ? "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
          <div className="mt-3 flex items-center gap-4 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <HardDrive size={18} />
            Storage
          </div>
          <div className="px-4 text-xs text-gray-500 dark:text-gray-400">
            {documents.length} document{documents.length === 1 ? "" : "s"} stored
            locally
          </div>
        </aside>

        {/* Content */}
        <main className="min-h-0 flex-1 overflow-auto rounded-tl-2xl bg-white px-8 py-6 dark:bg-gray-900">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-normal text-gray-700 dark:text-gray-200">
              {heading}
            </h1>
            <div className="flex items-center rounded-full border border-gray-200 dark:border-gray-700">
              <button
                type="button"
                aria-label="List view"
                onClick={() => setLayout("list")}
                className={`flex h-8 w-9 items-center justify-center rounded-l-full ${
                  layout === "list"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <ListIcon size={16} />
              </button>
              <button
                type="button"
                aria-label="Grid view"
                onClick={() => setLayout("grid")}
                className={`flex h-8 w-9 items-center justify-center rounded-r-full ${
                  layout === "grid"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <Grid2x2 size={16} />
              </button>
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
              <FileText size={48} className="text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {q
                  ? "No documents match your search."
                  : view === "starred"
                  ? "No starred documents yet."
                  : "No documents yet."}
              </p>
              {!q && view !== "starred" && (
                <button
                  type="button"
                  onClick={onCreate}
                  className="mt-1 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Plus size={16} />
                  New document
                </button>
              )}
            </div>
          ) : layout === "grid" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((doc) => (
                <DocCard
                  key={doc.id}
                  doc={doc}
                  onOpen={() => onOpen(doc.id)}
                  onRename={() => setRenaming(doc)}
                  onDelete={() => onDelete(doc.id)}
                  onToggleStar={() => onToggleStar(doc.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col">
              {visible.map((doc) => (
                <DocRow
                  key={doc.id}
                  doc={doc}
                  onOpen={() => onOpen(doc.id)}
                  onRename={() => setRenaming(doc)}
                  onDelete={() => onDelete(doc.id)}
                  onToggleStar={() => onToggleStar(doc.id)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Rename dialog */}
      {renaming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setRenaming(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-medium text-gray-800 dark:text-gray-100">
              Rename
            </h2>
            <input
              ref={renameInputRef}
              defaultValue={renaming.title}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename(e.currentTarget.value);
                if (e.key === "Escape") setRenaming(null);
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenaming(null)}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  commitRename(renameInputRef.current?.value ?? renaming.title)
                }
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
