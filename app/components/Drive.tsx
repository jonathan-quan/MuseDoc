"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Clock,
  FileText,
  Home,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Star,
  Trash2,
} from "lucide-react";
import {
  formatBytes,
  formatTimestamp,
  type StoredDocument,
} from "../lib/documents";
import { templates } from "../lib/templates";
import { createClient } from "../lib/supabase/client";

type View = "home" | "recent" | "starred" | "trash";
type Tab = "all" | "owned" | "shared" | "templates";

// Rough localStorage budget used to render the Storage meter. Browsers
// typically allow ~5 MB per origin.
const STORAGE_BUDGET_BYTES = 5 * 1024 * 1024;

// "Recent" shows documents touched within this window.
const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type DocActions = {
  onOpen: () => void;
  onRename: () => void;
  onToggleStar: () => void;
  onTrash: () => void;
  onRestore: () => void;
  onDeleteForever: () => void;
};

type DriveProps = {
  documents: StoredDocument[];
  storageBytes: number;
  onOpen: (id: string) => void;
  onCreate: (templateId?: string) => void;
  onRename: (id: string, title: string) => void;
  onToggleStar: (id: string) => void;
  onTrash: (id: string) => void;
  onRestore: (id: string) => void;
  onDeleteForever: (id: string) => void;
  onEmptyTrash: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
};

const navItems: { id: View; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "recent", label: "Recent", icon: Clock },
  { id: "starred", label: "Starred", icon: Star },
  { id: "trash", label: "Trash", icon: Trash2 },
];

// Per-view masthead copy + the right-hand "Fig." plate. The heading's last word
// is set in the red italic accent, mirroring the landing's "MuseDoc".
const META: Record<
  View,
  { eyebrow: string; lead: string; accent: string; fig: string }
> = {
  home: {
    eyebrow: "Workspace · Vol. 1",
    lead: "Welcome to ",
    accent: "MuseDoc",
    fig: "Fig. 02 — Recently opened",
  },
  recent: {
    eyebrow: "Last seven days",
    lead: "Recently ",
    accent: "opened",
    fig: "Fig. 03 — Recent activity",
  },
  starred: {
    eyebrow: "Marked pages",
    lead: "Your ",
    accent: "starred",
    fig: "Fig. 04 — Starred pages",
  },
  trash: {
    eyebrow: "Holding bay",
    lead: "The ",
    accent: "trash",
    fig: "Fig. 05 — Trash",
  },
};

const tabItems: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "owned", label: "Owned by me" },
  { id: "shared", label: "Shared" },
  { id: "templates", label: "Templates" },
];

/** Small-caps technical label in the mono face, shared across the dashboard. */
function Mono({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`font-mono uppercase tracking-[0.16em] text-[var(--ink-mute)] ${className}`}
    >
      {children}
    </span>
  );
}

/** Half-filled circle — the "contrast" glyph for the theme toggle. */
function ThemeGlyph() {
  return (
    <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden>
      <circle
        cx={8}
        cy={8}
        r={6.4}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
      />
      <path d="M8 1.6 A6.4 6.4 0 0 0 8 14.4 Z" fill="currentColor" />
    </svg>
  );
}

type MenuItem = {
  label: string;
  icon: typeof FileText;
  fn: () => void;
  danger?: boolean;
};

function CardMenu({
  doc,
  inTrash,
  actions,
}: {
  doc: StoredDocument;
  inTrash: boolean;
  actions: DocActions;
}) {
  const [open, setOpen] = useState(false);

  const items: MenuItem[] = inTrash
    ? [
        { label: "Restore", icon: RotateCcw, fn: actions.onRestore },
        {
          label: "Delete forever",
          icon: Trash2,
          fn: actions.onDeleteForever,
          danger: true,
        },
      ]
    : [
        { label: "Open", icon: FileText, fn: actions.onOpen },
        { label: "Rename", icon: Pencil, fn: actions.onRename },
        {
          label: doc.starred ? "Remove from starred" : "Add to starred",
          icon: Star,
          fn: actions.onToggleStar,
        },
        {
          label: "Move to trash",
          icon: Trash2,
          fn: actions.onTrash,
          danger: true,
        },
      ];

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label="Document options"
        onClick={() => setOpen((v) => !v)}
        className="flex size-7 items-center justify-center rounded-md text-[var(--ink-mute)] hover:bg-[var(--paper-2)] hover:text-[var(--ink)]"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-48 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--card)] py-1 shadow-lg">
            {items.map(({ label, icon: Icon, fn, danger }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setOpen(false);
                  fn();
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] hover:bg-[var(--paper-2)] ${
                  danger ? "text-[var(--accent)]" : "text-[var(--ink-soft)]"
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

/** A serif text preview of the document, or an "empty page" plate. */
function CardPreview({ text }: { text: string }) {
  const trimmed = text.trim();
  return (
    <div className="relative h-36 overflow-hidden px-4 py-3">
      {trimmed ? (
        <p className="font-serif text-[12.5px] leading-[1.6] whitespace-pre-wrap text-[var(--ink-soft)]">
          {trimmed.slice(0, 320)}
        </p>
      ) : (
        <div className="flex h-full items-center justify-center">
          <Mono className="text-[10px]">— Empty page —</Mono>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--card)] to-transparent" />
    </div>
  );
}

function DocCard({
  n,
  doc,
  inTrash,
  actions,
}: {
  n: number;
  doc: StoredDocument;
  inTrash: boolean;
  actions: DocActions;
}) {
  return (
    <article
      role={inTrash ? undefined : "button"}
      tabIndex={inTrash ? undefined : 0}
      onClick={inTrash ? undefined : actions.onOpen}
      onKeyDown={
        inTrash
          ? undefined
          : (e) => {
              if (e.key === "Enter" || e.key === " ") actions.onOpen();
            }
      }
      className={`group flex flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card)] text-left transition-all ${
        inTrash
          ? ""
          : "cursor-pointer hover:-translate-y-0.5 hover:border-[var(--line-2)] hover:shadow-[0_8px_24px_rgba(40,32,20,0.08)]"
      }`}
    >
      <header className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-2.5">
        <span className="font-mono text-[11px] tracking-wide text-[var(--ink-mute)]">
          № {String(n).padStart(2, "0")}
        </span>
        <span className="flex-1 truncate font-serif text-[15px] text-[var(--ink)]">
          {doc.title || "Untitled document"}
        </span>
        {doc.starred && !inTrash && (
          <Star size={13} className="shrink-0 fill-[var(--accent)] text-[var(--accent)]" />
        )}
        <CardMenu doc={doc} inTrash={inTrash} actions={actions} />
      </header>
      <CardPreview text={doc.text} />
      <footer className="flex items-center gap-1.5 border-t border-[var(--line)] px-4 py-2 font-mono text-[10px] tracking-[0.14em] text-[var(--ink-mute)] uppercase">
        <Clock size={11} />
        {inTrash && doc.trashedAt
          ? `Trashed ${formatTimestamp(doc.trashedAt)}`
          : `Opened ${formatTimestamp(doc.updatedAt)}`}
      </footer>
    </article>
  );
}

function DocRow({
  n,
  doc,
  inTrash,
  actions,
}: {
  n: number;
  doc: StoredDocument;
  inTrash: boolean;
  actions: DocActions;
}) {
  return (
    <div
      role={inTrash ? undefined : "button"}
      tabIndex={inTrash ? undefined : 0}
      onClick={inTrash ? undefined : actions.onOpen}
      onKeyDown={
        inTrash
          ? undefined
          : (e) => {
              if (e.key === "Enter" || e.key === " ") actions.onOpen();
            }
      }
      className={`group flex w-full items-center gap-4 px-3 py-3 text-left ${
        inTrash ? "" : "cursor-pointer hover:bg-[var(--paper-2)]"
      }`}
    >
      <span className="w-8 shrink-0 font-mono text-[11px] tracking-wide text-[var(--ink-mute)]">
        № {String(n).padStart(2, "0")}
      </span>
      <span className="flex-1 truncate font-serif text-[15px] text-[var(--ink)]">
        {doc.title || "Untitled document"}
      </span>
      {doc.starred && !inTrash && (
        <Star size={13} className="shrink-0 fill-[var(--accent)] text-[var(--accent)]" />
      )}
      <Mono className="hidden w-36 shrink-0 text-[10px] sm:block">
        {inTrash && doc.trashedAt
          ? formatTimestamp(doc.trashedAt)
          : formatTimestamp(doc.updatedAt)}
      </Mono>
      <CardMenu doc={doc} inTrash={inTrash} actions={actions} />
    </div>
  );
}

/** Template starter rendered as an editorial card in the "Templates" tab. */
function TemplateCard({
  n,
  template,
  onPick,
}: {
  n: number;
  template: (typeof templates)[number];
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="group flex flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card)] text-left transition-all hover:-translate-y-0.5 hover:border-[var(--line-2)] hover:shadow-[0_8px_24px_rgba(40,32,20,0.08)]"
    >
      <header className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-2.5">
        <span className="font-mono text-[11px] tracking-wide text-[var(--ink-mute)]">
          № {String(n).padStart(2, "0")}
        </span>
        <span className="flex-1 truncate font-serif text-[15px] text-[var(--ink)]">
          {template.label}
        </span>
        <Plus size={14} className="shrink-0 text-[var(--ink-mute)]" />
      </header>
      <div className="flex h-36 items-center px-4 py-3">
        <p className="font-serif text-[13px] leading-[1.6] text-[var(--ink-soft)]">
          {template.description}.
        </p>
      </div>
      <footer className="border-t border-[var(--line)] px-4 py-2">
        <Mono className="text-[10px] text-[var(--accent)]">
          New from template →
        </Mono>
      </footer>
    </button>
  );
}

/** Account block pinned to the foot of the sidebar (avatar · name · sign out). */
function SidebarAccount() {
  const [email, setEmail] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setEmail(user.email ?? null);
      const meta = user.user_metadata as
        | { avatar_url?: string; picture?: string; name?: string }
        | undefined;
      setAvatar(meta?.avatar_url ?? meta?.picture ?? null);
    });
  }, []);

  const name = email ? email.split("@")[0] : "Guest";
  const initial = (email?.[0] ?? "G").toUpperCase();

  return (
    <div className="mt-4 flex items-center gap-3 border-t border-[var(--line)] pt-4">
      <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--line-2)] bg-[var(--card)] font-serif text-[14px] font-semibold text-[var(--ink)]">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            referrerPolicy="no-referrer"
            className="size-full object-cover"
          />
        ) : (
          initial
        )}
      </span>
      <div className="min-w-0">
        <div className="truncate text-[14px] font-medium text-[var(--ink)]">
          {name}
        </div>
        {/* Native form POST hits the sign-out route handler, which clears the
            Supabase session cookies and redirects to the landing page. */}
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="font-mono text-[10px] tracking-[0.14em] text-[var(--ink-mute)] uppercase hover:text-[var(--ink)]"
          >
            Sign out →
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Drive({
  documents,
  storageBytes,
  onOpen,
  onCreate,
  onRename,
  onToggleStar,
  onTrash,
  onRestore,
  onDeleteForever,
  onEmptyTrash,
  theme,
  onToggleTheme,
}: DriveProps) {
  const [view, setView] = useState<View>("home");
  const [tab, setTab] = useState<Tab>("all");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
  const [renaming, setRenaming] = useState<StoredDocument | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) renameInputRef.current?.select();
  }, [renaming]);

  // ⌘K / Ctrl-K focuses the archive search, like a command palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Captured once at mount; a 7-day window doesn't need to track the live clock.
  const [recentCutoff] = useState(() => Date.now() - RECENT_WINDOW_MS);

  const inTrash = view === "trash";
  const q = query.trim().toLowerCase();
  const visible = documents
    // Trash shows only trashed documents; every other view shows only active
    // ones. (Starred needs the star; Recent needs recent activity.)
    .filter((doc) => (inTrash ? doc.trashedAt : !doc.trashedAt))
    .filter((doc) => (view === "starred" ? doc.starred : true))
    .filter((doc) => (view === "recent" ? doc.updatedAt >= recentCutoff : true))
    .filter(
      (doc) =>
        !q ||
        doc.title.toLowerCase().includes(q) ||
        doc.text.toLowerCase().includes(q)
    );

  const activeCount = documents.filter((doc) => !doc.trashedAt).length;
  const starredCount = documents.filter(
    (doc) => !doc.trashedAt && doc.starred
  ).length;
  const trashCount = documents.filter((doc) => doc.trashedAt).length;
  const navCount: Record<View, number> = {
    home: activeCount,
    recent: 0,
    starred: starredCount,
    trash: trashCount,
  };

  const storagePercent = Math.min(
    100,
    Math.round((storageBytes / STORAGE_BUDGET_BYTES) * 100)
  );

  const meta = META[view];
  // The top tabs are a home-only sub-filter; other views own the whole grid.
  const showTabs = view === "home";
  const showingTemplates = showTabs && tab === "templates";
  const showingShared = showTabs && tab === "shared";
  const list = showingShared ? [] : visible;
  const starterTemplates = templates.filter((t) => t.id !== "blank");

  function commitRename(title: string) {
    if (renaming) onRename(renaming.id, title.trim() || "Untitled document");
    setRenaming(null);
  }

  function actionsFor(doc: StoredDocument): DocActions {
    return {
      onOpen: () => onOpen(doc.id),
      onRename: () => setRenaming(doc),
      onToggleStar: () => onToggleStar(doc.id),
      onTrash: () => onTrash(doc.id),
      onRestore: () => onRestore(doc.id),
      onDeleteForever: () => onDeleteForever(doc.id),
    };
  }

  return (
    <div className="dot-grid flex h-full flex-col bg-[var(--paper)] text-[var(--ink)]">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center gap-4 border-b border-[var(--line)] px-5 py-3">
        <div className="flex w-52 shrink-0 items-baseline gap-2">
          <span className="font-serif text-[22px] font-semibold tracking-tight text-[var(--ink)]">
            MuseDoc
          </span>
          <Mono className="text-[10px]">v.1</Mono>
        </div>
        <div className="mx-1 hidden h-8 w-px bg-[var(--line)] md:block" />
        <div className="flex h-11 flex-1 items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--card)] px-4">
          <Mono className="text-[10px]">Find</Mono>
          <input
            ref={searchRef}
            value={query}
            aria-label="Search the page archive"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the page archive…"
            className="h-full flex-1 bg-transparent text-[14px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-mute)]"
          />
          <span className="font-mono text-[11px] text-[var(--ink-mute)]">⌘K</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={theme === "dark"}
          onClick={onToggleTheme}
          aria-label="Toggle dark mode"
          className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-[var(--line-2)] px-4 text-[var(--ink-soft)] hover:bg-[var(--paper-2)]"
        >
          <ThemeGlyph />
          <Mono className="text-[10px] text-[var(--ink-soft)]">Theme</Mono>
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ── Sidebar ───────────────────────────────────────── */}
        <aside className="flex w-60 shrink-0 flex-col border-r border-[var(--line)] px-4 py-4">
          <button
            type="button"
            onClick={() => onCreate()}
            className="group flex w-full items-center gap-2.5 rounded-xl bg-[var(--ink)] px-4 py-3 text-[14px] font-medium text-[var(--paper)] transition-transform hover:-translate-y-0.5"
          >
            <Plus
              size={16}
              className="transition-transform duration-200 group-hover:rotate-90"
            />
            <span className="flex-1 text-left">New document</span>
            <span className="font-mono text-[10px] tracking-[0.1em] text-[var(--paper)] opacity-60">
              ⌘N
            </span>
          </button>

          <Mono className="mt-6 mb-1 px-2 text-[10px]">Library</Mono>
          <nav className="flex flex-col gap-0.5">
            {navItems.map(({ id, label, icon: Icon }) => {
              const active = view === id;
              const count = navCount[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] transition-colors ${
                    active
                      ? "border border-[var(--line)] bg-[var(--card)] font-medium text-[var(--ink)]"
                      : "border border-transparent text-[var(--ink-soft)] hover:bg-[var(--paper-2)]"
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="flex-1 text-left">{label}</span>
                  {count > 0 && (
                    <span className="font-mono text-[11px] text-[var(--ink-mute)]">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Storage meter + account, pinned to the foot. */}
          <div className="mt-auto">
            <div className="h-px w-8 bg-[var(--ink)]" />
            <Mono className="mt-3 block text-[10px]">Storage</Mono>
            <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-[var(--line)]">
              <div
                className="h-full rounded-full bg-[var(--ink)]"
                style={{ width: `${Math.max(3, storagePercent)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between font-mono text-[10px] tracking-[0.1em] text-[var(--ink-mute)] uppercase">
              <span>{formatBytes(storageBytes)} used</span>
              <span>
                {activeCount} page{activeCount === 1 ? "" : "s"}
              </span>
            </div>
            <SidebarAccount />
          </div>
        </aside>

        {/* ── Content ───────────────────────────────────────── */}
        <main className="min-h-0 flex-1 overflow-auto px-8 py-8 lg:px-10">
          {/* Masthead */}
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-[var(--ink-mute)]" />
                <Mono className="text-[11px]">{meta.eyebrow}</Mono>
              </div>
              <h1 className="mt-3 font-serif text-[clamp(2.2rem,4.5vw,3.4rem)] leading-[1.05] font-medium tracking-[-0.01em] text-[var(--ink)]">
                {meta.lead}
                <span className="text-[var(--accent)] italic">{meta.accent}</span>
                .
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {inTrash && list.length > 0 && (
                <button
                  type="button"
                  onClick={onEmptyTrash}
                  className="rounded-full border border-[var(--line-2)] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] text-[var(--accent)] uppercase hover:bg-[var(--paper-2)]"
                >
                  Empty trash
                </button>
              )}
              {/* List / Grid toggle */}
              <div className="flex items-center rounded-full border border-[var(--line-2)] p-0.5 font-mono text-[10px] tracking-[0.14em] uppercase">
                {(["list", "grid"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLayout(l)}
                    className={`rounded-full px-3 py-1.5 transition-colors ${
                      layout === l
                        ? "bg-[var(--ink)] text-[var(--paper)]"
                        : "text-[var(--ink-mute)] hover:text-[var(--ink)]"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs + figure plate */}
          <div className="mt-8 flex items-center justify-between gap-4 border-t border-[var(--line)] pt-5">
            <div className="flex items-center gap-1">
              {showTabs ? (
                tabItems.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`rounded-full px-3.5 py-1.5 font-mono text-[11px] tracking-[0.08em] transition-colors ${
                      tab === t.id
                        ? "bg-[var(--ink)] text-[var(--paper)]"
                        : "text-[var(--ink-mute)] hover:text-[var(--ink)]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))
              ) : (
                <span className="rounded-full bg-[var(--ink)] px-3.5 py-1.5 font-mono text-[11px] tracking-[0.08em] text-[var(--paper)] capitalize">
                  {view}
                </span>
              )}
            </div>
            <Mono className="hidden text-[11px] sm:block">{meta.fig}</Mono>
          </div>

          {/* Body */}
          <div className="mt-7">
            {showingTemplates ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {starterTemplates.map((t, i) => (
                  <TemplateCard
                    key={t.id}
                    n={i + 1}
                    template={t}
                    onPick={() => onCreate(t.id)}
                  />
                ))}
              </div>
            ) : list.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
                {inTrash ? (
                  <Trash2 size={40} className="text-[var(--line-2)]" />
                ) : (
                  <FileText size={40} className="text-[var(--line-2)]" />
                )}
                <Mono className="text-[11px]">
                  {q
                    ? "No pages match your search"
                    : showingShared
                      ? "Nothing shared with you yet"
                      : view === "starred"
                        ? "No starred pages yet"
                        : view === "recent"
                          ? "Nothing opened in the last 7 days"
                          : inTrash
                            ? "Trash is empty"
                            : "No pages yet"}
                </Mono>
                {!q && !showingShared && view !== "starred" && !inTrash && (
                  <button
                    type="button"
                    onClick={() => onCreate()}
                    className="mt-1 flex items-center gap-2 rounded-full bg-[var(--ink)] px-4 py-2 text-[13px] font-medium text-[var(--paper)] hover:-translate-y-0.5"
                  >
                    <Plus size={15} />
                    New document
                  </button>
                )}
              </div>
            ) : layout === "grid" ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {list.map((doc, i) => (
                  <DocCard
                    key={doc.id}
                    n={i + 1}
                    doc={doc}
                    inTrash={inTrash}
                    actions={actionsFor(doc)}
                  />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
                {list.map((doc, i) => (
                  <DocRow
                    key={doc.id}
                    n={i + 1}
                    doc={doc}
                    inTrash={inTrash}
                    actions={actionsFor(doc)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Rename dialog ────────────────────────────────────── */}
      {renaming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setRenaming(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--card)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Mono className="text-[10px]">Rename page</Mono>
            <input
              ref={renameInputRef}
              aria-label="Document name"
              defaultValue={renaming.title}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename(e.currentTarget.value);
                if (e.key === "Escape") setRenaming(null);
              }}
              className="mt-3 w-full rounded-lg border border-[var(--line-2)] bg-[var(--paper)] px-3 py-2 font-serif text-[15px] text-[var(--ink)] outline-none focus:border-[var(--ink-mute)]"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenaming(null)}
                className="rounded-lg px-4 py-2 text-[13px] font-medium text-[var(--ink-soft)] hover:bg-[var(--paper-2)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  commitRename(renameInputRef.current?.value ?? renaming.title)
                }
                className="rounded-lg bg-[var(--ink)] px-4 py-2 text-[13px] font-medium text-[var(--paper)] hover:opacity-90"
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
