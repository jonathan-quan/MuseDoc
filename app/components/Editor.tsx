"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import {
  TextStyle,
  Color,
  FontFamily,
  FontSize,
  LineHeight,
} from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import {
  Table,
  TableRow,
  TableHeader,
  TableCell,
} from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type ChangeEvent,
} from "react";
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  Code,
  Baseline,
  Highlighter,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  AlignVerticalSpaceAround,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Table as TableIcon,
  Image as ImageIcon,
  Frame as FrameIcon,
  Minus,
  Search,
  Mic,
  Printer,
  Download,
  Plus,
  RemoveFormatting,
  ListTree,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react";
import { Frame } from "../extensions/Frame";
import { SearchReplace } from "../extensions/SearchReplace";

/** Compact icon button. */
function TBtn({
  title,
  onClick,
  active = false,
  disabled = false,
  children,
}: {
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={[
        "flex h-8 min-w-8 items-center justify-center rounded-md px-1.5",
        active
          ? "bg-blue-100 text-blue-700"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
        disabled ? "cursor-not-allowed opacity-40" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/** Larger labeled button (icon on top, text below) for action commands. */
function CmdBtn({
  title,
  label,
  onClick,
  active = false,
  disabled = false,
  children,
}: {
  title: string;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={[
        "flex h-full min-w-[58px] flex-col items-center justify-center gap-1 rounded-md px-2.5 py-1",
        active
          ? "bg-blue-100 text-blue-700"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
        disabled ? "cursor-not-allowed opacity-40" : "",
      ].join(" ")}
    >
      {children}
      <span className="text-[11px] leading-none">{label}</span>
    </button>
  );
}

/** Full-height vertical separator between toolbar groups. */
function GroupDivider() {
  return <span className="mx-1 w-px self-stretch bg-gray-200" />;
}

/** A bordered control that opens a small popover menu below it. */
function IconDropdown({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        title={title}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 items-center gap-0.5 rounded-md border border-gray-200 bg-white px-1.5 text-gray-600 hover:bg-gray-50"
      >
        {icon}
        <ChevronDown size={13} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-1 rounded-md border border-gray-200 bg-white p-1 shadow-lg">
            {children(() => setOpen(false))}
          </div>
        </>
      )}
    </div>
  );
}

const selectClass =
  "h-8 cursor-pointer rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-600 outline-none hover:bg-gray-50";

function TableGridPicker({
  onPick,
}: {
  onPick: (rows: number, cols: number) => void;
}) {
  const MAX_ROWS = 8;
  const MAX_COLS = 10;
  const [hover, setHover] = useState({ rows: 0, cols: 0 });
  return (
    <div className="absolute left-0 z-20 mt-1 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${MAX_COLS}, 1rem)` }}
        onMouseLeave={() => setHover({ rows: 0, cols: 0 })}
      >
        {Array.from({ length: MAX_ROWS * MAX_COLS }).map((_, idx) => {
          const r = Math.floor(idx / MAX_COLS) + 1;
          const c = (idx % MAX_COLS) + 1;
          const active = r <= hover.rows && c <= hover.cols;
          return (
            <button
              key={idx}
              type="button"
              onMouseEnter={() => setHover({ rows: r, cols: c })}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPick(r, c)}
              className={`h-4 w-4 rounded-[3px] border ${
                active
                  ? "border-blue-500 bg-blue-100"
                  : "border-gray-300 bg-gray-50"
              }`}
            />
          );
        })}
      </div>
      <div className="mt-2 text-center text-xs text-gray-500">
        {hover.rows && hover.cols
          ? `${hover.cols} × ${hover.rows}`
          : "Insert table"}
      </div>
    </div>
  );
}

export default function Editor() {
  const [showOutline, setShowOutline] = useState(true);
  const [showFind, setShowFind] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [showInsert, setShowInsert] = useState(false);
  const [listening, setListening] = useState(false);
  const [, setTick] = useState(0); // force re-render on editor changes

  const recognitionRef = useRef<unknown>(null);
  const findInputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false },
      }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      LineHeight.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Superscript,
      Subscript,
      TaskList,
      TaskItem.configure({ nested: true }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Frame,
      SearchReplace,
      Placeholder.configure({ placeholder: "Start writing…" }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "editor-content min-h-[60vh] text-[17px] leading-8 text-gray-800 outline-none",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const update = () => setTick((t) => t + 1);
    editor.on("transaction", update);
    return () => {
      editor.off("transaction", update);
    };
  }, [editor]);

  // ── Outline from headings ──────────────────────────────
  const headings: { level: number; text: string; pos: number }[] = [];
  if (editor) {
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "heading") {
        headings.push({
          level: node.attrs.level,
          text: node.textContent || "(empty heading)",
          pos,
        });
      }
    });
  }

  // ── Links / images ─────────────────────────────────────
  function setLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL:", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function addImage() {
    if (!editor) return;
    const url = window.prompt("Image URL:");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }

  // ── Paragraph style dropdown ───────────────────────────
  const currentStyle = !editor
    ? "p"
    : editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
    ? "h2"
    : editor.isActive("heading", { level: 3 })
    ? "h3"
    : "p";

  function applyStyle(value: string) {
    if (!editor) return;
    if (value === "p") editor.chain().focus().setParagraph().run();
    else {
      const level = Number(value.slice(1)) as 1 | 2 | 3;
      editor.chain().focus().toggleHeading({ level }).run();
    }
  }

  // ── Font / size (apply-and-reset selects) ──────────────
  function onSelect(
    e: ChangeEvent<HTMLSelectElement>,
    apply: (v: string) => void
  ) {
    if (e.target.value) apply(e.target.value);
  }

  // Current alignment, for the alignment dropdown's icon.
  const alignIcon = editor?.isActive({ textAlign: "center" }) ? (
    <AlignCenter size={16} />
  ) : editor?.isActive({ textAlign: "right" }) ? (
    <AlignRight size={16} />
  ) : editor?.isActive({ textAlign: "justify" }) ? (
    <AlignJustify size={16} />
  ) : (
    <AlignLeft size={16} />
  );

  // ── Dictation (Web Speech API) ─────────────────────────
  // Feature-detect only after mount so the first client render matches the
  // server (both start as "unsupported"), avoiding a hydration mismatch.
  const [dictationSupported, setDictationSupported] = useState(false);
  useEffect(() => {
    setDictationSupported(
      "SpeechRecognition" in window || "webkitSpeechRecognition" in window
    );
  }, []);

  function toggleDictation() {
    if (!editor || !dictationSupported) return;
    if (listening) {
      (recognitionRef.current as { stop: () => void } | null)?.stop();
      return;
    }
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (event) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) text += event.results[i][0].transcript;
      }
      if (text) editor.chain().focus().insertContent(text).run();
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  // ── Print / export ─────────────────────────────────────
  function printDoc() {
    if (!editor) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(
      `<html><head><title>Document</title><style>body{font-family:system-ui,sans-serif;max-width:680px;margin:48px auto;padding:0 24px;line-height:1.6;color:#111}h1,h2,h3{line-height:1.25}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px 10px}th{background:#f3f4f6}img{max-width:100%}blockquote{border-left:3px solid #ccc;padding-left:1em;color:#555}[data-type=frame]{border:1px solid #ccc;border-radius:8px;padding:12px 16px}</style></head><body>${editor.getHTML()}</body></html>`
    );
    win.document.close();
    win.focus();
    win.print();
  }

  function download(filename: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Find & replace state (read from extension storage) ─
  const search = editor?.storage.searchReplace as
    | { searchTerm: string; results: { from: number }[]; currentIndex: number }
    | undefined;
  const matchCount = search?.results.length ?? 0;
  const currentMatch = search ? search.currentIndex + 1 : 0;
  const [replaceValue, setReplaceValue] = useState("");

  useEffect(() => {
    if (showFind) findInputRef.current?.focus();
    else editor?.chain().clearSearch().run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFind]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── Toolbar (grouped, two-row) ─────────────────────── */}
      <div
        ref={toolbarRef}
        onWheel={(e) => {
          if (toolbarRef.current && e.deltaY !== 0) {
            toolbarRef.current.scrollLeft += e.deltaY;
          }
        }}
        className="toolbar-scroll flex shrink-0 items-stretch gap-x-1.5 overflow-x-auto border-b border-gray-200 px-3 py-2 [&>*]:shrink-0"
      >
        {/* History & view */}
        <div className="flex flex-col justify-center gap-1">
          <div className="flex items-center gap-0.5">
            <TBtn
              title="Undo"
              disabled={!editor?.can().undo()}
              onClick={() => editor?.chain().focus().undo().run()}
            >
              <Undo2 size={16} />
            </TBtn>
            <TBtn
              title="Redo"
              disabled={!editor?.can().redo()}
              onClick={() => editor?.chain().focus().redo().run()}
            >
              <Redo2 size={16} />
            </TBtn>
          </div>
          <div className="flex items-center gap-0.5">
            <TBtn
              title="Toggle outline"
              active={showOutline}
              onClick={() => setShowOutline((v) => !v)}
            >
              <ListTree size={16} />
            </TBtn>
            <TBtn
              title="Clear formatting"
              onClick={() =>
                editor?.chain().focus().unsetAllMarks().clearNodes().run()
              }
            >
              <RemoveFormatting size={16} />
            </TBtn>
          </div>
        </div>

        <GroupDivider />

        {/* Font & character */}
        <div className="flex flex-col justify-center gap-1">
          <select
            aria-label="Font family"
            value=""
            onChange={(e) =>
              onSelect(e, (v) => editor?.chain().focus().setFontFamily(v).run())
            }
            className={`${selectClass} w-full`}
          >
            <option value="" disabled>
              Font
            </option>
            {[
              "Arial",
              "Georgia",
              "Times New Roman",
              "Courier New",
              "Verdana",
            ].map((f) => (
              <option key={f} value={f} style={{ fontFamily: f }}>
                {f}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-0.5">
            <TBtn
              title="Bold"
              active={editor?.isActive("bold")}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              <Bold size={16} />
            </TBtn>
            <TBtn
              title="Italic"
              active={editor?.isActive("italic")}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <Italic size={16} />
            </TBtn>
            <TBtn
              title="Underline"
              active={editor?.isActive("underline")}
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
            >
              <Underline size={16} />
            </TBtn>
            <select
              aria-label="Font size"
              value=""
              onChange={(e) =>
                onSelect(e, (v) =>
                  editor?.chain().focus().setFontSize(`${v}px`).run()
                )
              }
              className={`${selectClass} w-[4.5rem]`}
            >
              <option value="" disabled>
                Size
              </option>
              {["12", "14", "16", "18", "20", "24", "30", "36"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <GroupDivider />

        {/* Paragraph */}
        <div className="flex flex-col justify-center gap-1">
          <select
            aria-label="Paragraph style"
            value={currentStyle}
            onChange={(e) => applyStyle(e.target.value)}
            className={`${selectClass} w-full`}
          >
            <option value="p">Normal</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
          </select>
          <div className="flex items-center gap-0.5">
            <IconDropdown title="Alignment" icon={alignIcon}>
              {(close) => (
                <div className="flex gap-0.5">
                  {(
                    [
                      ["left", AlignLeft],
                      ["center", AlignCenter],
                      ["right", AlignRight],
                      ["justify", AlignJustify],
                    ] as const
                  ).map(([val, Ico]) => (
                    <button
                      key={val}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        editor?.chain().focus().setTextAlign(val).run();
                        close();
                      }}
                      className={`flex h-8 w-8 items-center justify-center rounded ${
                        editor?.isActive({ textAlign: val })
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <Ico size={16} />
                    </button>
                  ))}
                </div>
              )}
            </IconDropdown>
            <IconDropdown
              title="Line spacing"
              icon={<AlignVerticalSpaceAround size={16} />}
            >
              {(close) => (
                <div className="flex w-20 flex-col">
                  {["1", "1.15", "1.5", "2"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        editor?.chain().focus().setLineHeight(s).run();
                        close();
                      }}
                      className="rounded px-3 py-1 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </IconDropdown>
          </div>
        </div>

        <GroupDivider />

        {/* Inline marks & lists */}
        <div className="flex flex-col justify-center gap-1">
          <div className="flex items-center gap-0.5">
            <TBtn
              title="Insert link"
              active={editor?.isActive("link")}
              onClick={setLink}
            >
              <LinkIcon size={16} />
            </TBtn>
            <TBtn
              title="Inline code"
              active={editor?.isActive("code")}
              onClick={() => editor?.chain().focus().toggleCode().run()}
            >
              <Code size={16} />
            </TBtn>
            <TBtn
              title="Strikethrough"
              active={editor?.isActive("strike")}
              onClick={() => editor?.chain().focus().toggleStrike().run()}
            >
              <Strikethrough size={16} />
            </TBtn>
            <TBtn
              title="Superscript"
              active={editor?.isActive("superscript")}
              onClick={() => editor?.chain().focus().toggleSuperscript().run()}
            >
              <SuperscriptIcon size={16} />
            </TBtn>
            {/* Text color */}
            <label
              title="Text color"
              className="relative flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-md px-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              <Baseline size={16} />
              <input
                type="color"
                aria-label="Text color"
                onChange={(e) =>
                  editor?.chain().focus().setColor(e.target.value).run()
                }
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>
          <div className="flex items-center gap-0.5">
            <TBtn
              title="Bulleted list"
              active={editor?.isActive("bulletList")}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            >
              <List size={16} />
            </TBtn>
            <TBtn
              title="Numbered list"
              active={editor?.isActive("orderedList")}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered size={16} />
            </TBtn>
            <TBtn
              title="Checklist"
              active={editor?.isActive("taskList")}
              onClick={() => editor?.chain().focus().toggleTaskList().run()}
            >
              <ListChecks size={16} />
            </TBtn>
            <TBtn
              title="Subscript"
              active={editor?.isActive("subscript")}
              onClick={() => editor?.chain().focus().toggleSubscript().run()}
            >
              <SubscriptIcon size={16} />
            </TBtn>
            {/* Highlight */}
            <label
              title="Highlight color"
              className="relative flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-md px-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              <Highlighter size={16} />
              <input
                type="color"
                aria-label="Highlight color"
                onChange={(e) =>
                  editor
                    ?.chain()
                    .focus()
                    .setHighlight({ color: e.target.value })
                    .run()
                }
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>
        </div>

        <GroupDivider />

        {/* Block inserts (labeled) */}
        <div className="flex items-stretch gap-0.5">
          <div className="relative">
            <CmdBtn
              title="Insert table"
              label="Table"
              active={showTablePicker}
              onClick={() => setShowTablePicker((v) => !v)}
            >
              <TableIcon size={18} />
            </CmdBtn>
            {showTablePicker && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowTablePicker(false)}
                />
                <TableGridPicker
                  onPick={(rows, cols) => {
                    editor
                      ?.chain()
                      .focus()
                      .insertTable({ rows, cols, withHeaderRow: true })
                      .run();
                    setShowTablePicker(false);
                  }}
                />
              </>
            )}
          </div>

          <CmdBtn title="Insert image" label="Image" onClick={addImage}>
            <ImageIcon size={18} />
          </CmdBtn>

          <div className="relative">
            <CmdBtn
              title="Insert element"
              label="Insert"
              active={showInsert}
              onClick={() => setShowInsert((v) => !v)}
            >
              <Plus size={18} />
            </CmdBtn>
            {showInsert && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowInsert(false)}
                />
                <div className="absolute left-0 z-20 mt-1 w-44 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      editor?.chain().focus().toggleBlockquote().run();
                      setShowInsert(false);
                    }}
                  >
                    <Quote size={15} /> Quote
                  </button>
                  <button
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      editor?.chain().focus().toggleFrame().run();
                      setShowInsert(false);
                    }}
                  >
                    <FrameIcon size={15} /> Frame
                  </button>
                  <button
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      editor?.chain().focus().setHorizontalRule().run();
                      setShowInsert(false);
                    }}
                  >
                    <Minus size={15} /> Horizontal line
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <GroupDivider />

        {/* Tools (labeled) */}
        <div className="flex items-stretch gap-0.5">
          <CmdBtn
            title="Find & replace"
            label="Find"
            active={showFind}
            onClick={() => setShowFind((v) => !v)}
          >
            <Search size={18} />
          </CmdBtn>
          <CmdBtn
            title={
              dictationSupported
                ? listening
                  ? "Stop dictation"
                  : "Dictate"
                : "Dictation not supported in this browser"
            }
            label="Dictate"
            active={listening}
            disabled={!dictationSupported}
            onClick={toggleDictation}
          >
            <Mic size={18} />
          </CmdBtn>
        </div>

        <GroupDivider />

        {/* Output (labeled) */}
        <div className="flex items-stretch gap-0.5">
          <CmdBtn title="Print" label="Print" onClick={printDoc}>
            <Printer size={18} />
          </CmdBtn>
          <div className="relative">
            <CmdBtn
              title="Export"
              label="Export"
              active={showExport}
              onClick={() => setShowExport((v) => !v)}
            >
              <Download size={18} />
            </CmdBtn>
            {showExport && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowExport(false)}
                />
                <div className="absolute right-0 z-20 mt-1 w-44 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      if (editor)
                        download("document.html", editor.getHTML(), "text/html");
                      setShowExport(false);
                    }}
                  >
                    Export as HTML
                  </button>
                  <button
                    className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      if (editor)
                        download("document.txt", editor.getText(), "text/plain");
                      setShowExport(false);
                    }}
                  >
                    Export as Text
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Find & replace bar ────────────────────────────── */}
      {showFind && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2">
          <input
            ref={findInputRef}
            placeholder="Find"
            onChange={(e) => editor?.chain().setSearchTerm(e.target.value).run()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                editor
                  ?.chain()
                  [e.shiftKey ? "previousSearchResult" : "nextSearchResult"]()
                  .run();
              }
            }}
            className="h-8 w-44 rounded border border-gray-300 bg-white px-2 text-sm outline-none focus:border-blue-400"
          />
          <span className="min-w-14 text-xs text-gray-500">
            {matchCount ? `${currentMatch} / ${matchCount}` : "No results"}
          </span>
          <TBtn
            title="Previous"
            disabled={!matchCount}
            onClick={() => editor?.chain().previousSearchResult().run()}
          >
            <ChevronUp size={16} />
          </TBtn>
          <TBtn
            title="Next"
            disabled={!matchCount}
            onClick={() => editor?.chain().nextSearchResult().run()}
          >
            <ChevronDown size={16} />
          </TBtn>

          <input
            placeholder="Replace with"
            value={replaceValue}
            onChange={(e) => {
              setReplaceValue(e.target.value);
              editor?.chain().setReplaceTerm(e.target.value).run();
            }}
            className="h-8 w-44 rounded border border-gray-300 bg-white px-2 text-sm outline-none focus:border-blue-400"
          />
          <button
            disabled={!matchCount}
            onClick={() => editor?.chain().focus().replaceCurrent().run()}
            className="h-8 rounded border border-gray-300 bg-white px-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-40"
          >
            Replace
          </button>
          <button
            disabled={!matchCount}
            onClick={() => editor?.chain().focus().replaceAll().run()}
            className="h-8 rounded border border-gray-300 bg-white px-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-40"
          >
            Replace all
          </button>
          <button
            title="Close"
            onClick={() => setShowFind(false)}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded text-gray-500 hover:bg-gray-200"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Body: outline + writing surface ───────────────── */}
      <div className="flex min-h-0 flex-1">
        {showOutline && (
          <nav className="w-56 shrink-0 overflow-y-auto border-r border-gray-100 bg-gray-50/60 px-3 py-4">
            <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Outline
            </div>
            {headings.length === 0 ? (
              <p className="px-1 text-xs text-gray-400">
                Add headings to build an outline.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {headings.map((h, i) => (
                  <li key={i}>
                    <button
                      onClick={() =>
                        editor
                          ?.chain()
                          .focus()
                          .setTextSelection(h.pos + 1)
                          .scrollIntoView()
                          .run()
                      }
                      style={{ paddingLeft: `${(h.level - 1) * 12 + 6}px` }}
                      className="block w-full truncate rounded py-1 pr-1.5 text-left text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    >
                      {h.text}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </nav>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl px-10 py-12">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Minimal typing for the Web Speech API (not in standard lib.dom yet).
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult:
    | ((event: {
        resultIndex: number;
        results: { isFinal: boolean; 0: { transcript: string } }[];
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
