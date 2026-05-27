"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { mergeAttributes, ResizableNodeView } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
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
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type ChangeEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
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
  Upload,
  Plus,
  RemoveFormatting,
  ListTree,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react";
import { Frame } from "../extensions/Frame";
import { SearchReplace } from "../extensions/SearchReplace";

type ImageFit = "contain" | "cover" | "fill";
type ImageAlign = "left" | "center" | "right";

const EditableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      opacity: {
        default: 100,
        parseHTML: (element) =>
          Number(element.getAttribute("data-image-opacity")) || 100,
        renderHTML: (attributes) => ({
          "data-image-opacity": attributes.opacity,
        }),
      },
      fit: {
        default: "contain",
        parseHTML: (element) =>
          (element.getAttribute("data-image-fit") as ImageFit | null) ??
          "contain",
        renderHTML: (attributes) => ({
          "data-image-fit": attributes.fit,
        }),
      },
      align: {
        default: "left",
        parseHTML: (element) =>
          (element.getAttribute("data-image-align") as ImageAlign | null) ??
          "left",
        renderHTML: (attributes) => ({
          "data-image-align": attributes.align,
        }),
      },
      cropX: {
        default: 50,
        parseHTML: (element) =>
          Number(element.getAttribute("data-image-crop-x")) || 50,
        renderHTML: (attributes) => ({
          "data-image-crop-x": attributes.cropX,
        }),
      },
      cropY: {
        default: 50,
        parseHTML: (element) =>
          Number(element.getAttribute("data-image-crop-y")) || 50,
        renderHTML: (attributes) => ({
          "data-image-crop-y": attributes.cropY,
        }),
      },
      radius: {
        default: 6,
        parseHTML: (element) =>
          Number(element.getAttribute("data-image-radius")) || 6,
        renderHTML: (attributes) => ({
          "data-image-radius": attributes.radius,
        }),
      },
      rotate: {
        default: 0,
        parseHTML: (element) =>
          Number(element.getAttribute("data-image-rotate")) || 0,
        renderHTML: (attributes) => ({
          "data-image-rotate": attributes.rotate,
        }),
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const {
      width,
      height,
      opacity,
      fit,
      cropX,
      cropY,
      radius,
      rotate,
      align,
    } = node.attrs;
    const { style, ...attrs } = HTMLAttributes;
    const styles = [
      style,
      "display: block",
      width ? `width: ${width}px` : null,
      height ? `height: ${height}px` : null,
      `opacity: ${Number(opacity) / 100}`,
      `object-fit: ${fit}`,
      `object-position: ${cropX}% ${cropY}%`,
      `border-radius: ${radius}px`,
      rotate ? `transform: rotate(${rotate}deg)` : null,
      align === "center" ? "margin-left: auto" : null,
      align === "center" ? "margin-right: auto" : null,
      align === "right" ? "margin-left: auto" : null,
      align === "right" ? "margin-right: 0" : null,
    ].filter(Boolean);

    return [
      "img",
      mergeAttributes(this.options.HTMLAttributes, attrs, {
        style: styles.join("; "),
      }),
    ];
  },

  addNodeView() {
    return ({ node, getPos, HTMLAttributes, editor }) => {
      const el = document.createElement("img");
      let container: HTMLElement | null = null;

      const applyAttributes = (attrs: Record<string, unknown>) => {
        Object.entries(attrs).forEach(([key, value]) => {
          if (
            value == null ||
            key === "width" ||
            key === "height" ||
            key === "style"
          ) {
            return;
          }
          el.setAttribute(key, String(value));
        });

        const width = Number(attrs.width) || null;
        const height = Number(attrs.height) || null;
        const opacity = Number(attrs.opacity) || 100;
        const fit = String(attrs.fit ?? "contain");
        const cropX = Number(attrs.cropX) || 50;
        const cropY = Number(attrs.cropY) || 50;
        const radius = Number(attrs.radius) || 6;
        const rotate = Number(attrs.rotate) || 0;
        const align = String(attrs.align ?? "left") as ImageAlign;

        el.style.display = "block";
        el.style.maxWidth = "100%";
        el.style.width = width ? `${width}px` : "";
        el.style.height = height ? `${height}px` : "";
        el.style.opacity = String(opacity / 100);
        el.style.objectFit = fit;
        el.style.objectPosition = `${cropX}% ${cropY}%`;
        el.style.borderRadius = `${radius}px`;
        el.style.transform = rotate ? `rotate(${rotate}deg)` : "";
        el.style.marginLeft = align === "center" || align === "right" ? "auto" : "";
        el.style.marginRight = align === "center" ? "auto" : "";
        if (container) {
          container.style.justifyContent =
            align === "center"
              ? "center"
              : align === "right"
              ? "flex-end"
              : "flex-start";
        }
      };

      applyAttributes({ ...HTMLAttributes, ...node.attrs });

      const nodeView = new ResizableNodeView({
        element: el,
        editor,
        node,
        getPos,
        onResize: (width, height) => {
          el.style.width = `${width}px`;
          el.style.height = `${height}px`;
        },
        onCommit: (width, height) => {
          const pos = getPos();
          if (pos === undefined) return;
          editor
            .chain()
            .setNodeSelection(pos)
            .updateAttributes(this.name, { width, height })
            .run();
        },
        onUpdate: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          applyAttributes({ ...HTMLAttributes, ...updatedNode.attrs });
          return true;
        },
        options: {
          directions: [
            "top",
            "right",
            "bottom",
            "left",
            "top-right",
            "top-left",
            "bottom-right",
            "bottom-left",
          ],
          className: {
            container: "doc-image-resize-container",
            wrapper: "doc-image-resize-wrapper",
            handle: "doc-image-resize-handle",
            resizing: "doc-image-resizing",
          },
          min: { width: 80, height: 60 },
          preserveAspectRatio: false,
        },
      });

      container = nodeView.dom as HTMLElement;
      applyAttributes({ ...HTMLAttributes, ...node.attrs });

      return nodeView;
    };
  },
});

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
          ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100",
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
          ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100",
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
  return <span className="mx-1 w-px self-stretch bg-gray-200 dark:bg-gray-700" />;
}

/**
 * Renders a popover in a portal anchored under `anchorRef`, so it floats above
 * everything and isn't clipped by the toolbar's horizontal-scroll overflow.
 */
function PortalMenu({
  open,
  onClose,
  anchorRef,
  align = "left",
  children,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  align?: "left" | "right";
  children: ReactNode;
}) {
  const [coords, setCoords] = useState<{
    top: number;
    left?: number;
    right?: number;
  } | null>(null);

  useEffect(() => {
    if (open && anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect();
      setCoords(
        align === "right"
          ? { top: r.bottom + 4, right: window.innerWidth - r.right }
          : { top: r.bottom + 4, left: r.left }
      );
    } else {
      setCoords(null);
    }
  }, [open, align, anchorRef]);

  if (!open || !coords) return null;
  return createPortal(
    <>
      <div className="fixed inset-0 z-[90]" onMouseDown={onClose} />
      <div
        className="fixed z-[91]"
        style={coords}
        onMouseDown={(e) => e.preventDefault()}
      >
        {children}
      </div>
    </>,
    document.body
  );
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
  const btnRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title={title}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 items-center gap-0.5 rounded-md border border-gray-200 bg-white px-1.5 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        {icon}
        <ChevronDown size={13} />
      </button>
      <PortalMenu open={open} onClose={() => setOpen(false)} anchorRef={btnRef}>
        <div className="rounded-md border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {children(() => setOpen(false))}
        </div>
      </PortalMenu>
    </>
  );
}

const selectClass =
  "h-8 cursor-pointer rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-600 outline-none hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700";

// Common fonts (with a generic fallback so they render even when the exact
// face isn't installed). The dropdown previews each name in its own font.
const FONT_FAMILIES: { name: string; fallback: string }[] = [
  { name: "Arial", fallback: "sans-serif" },
  { name: "Helvetica", fallback: "sans-serif" },
  { name: "Verdana", fallback: "sans-serif" },
  { name: "Tahoma", fallback: "sans-serif" },
  { name: "Trebuchet MS", fallback: "sans-serif" },
  { name: "Segoe UI", fallback: "sans-serif" },
  { name: "Calibri", fallback: "sans-serif" },
  { name: "Gill Sans", fallback: "sans-serif" },
  { name: "Century Gothic", fallback: "sans-serif" },
  { name: "Franklin Gothic Medium", fallback: "sans-serif" },
  { name: "Lucida Sans", fallback: "sans-serif" },
  { name: "Optima", fallback: "sans-serif" },
  { name: "Futura", fallback: "sans-serif" },
  { name: "Geneva", fallback: "sans-serif" },
  { name: "Impact", fallback: "sans-serif" },
  { name: "Times New Roman", fallback: "serif" },
  { name: "Georgia", fallback: "serif" },
  { name: "Garamond", fallback: "serif" },
  { name: "Palatino Linotype", fallback: "serif" },
  { name: "Book Antiqua", fallback: "serif" },
  { name: "Cambria", fallback: "serif" },
  { name: "Baskerville", fallback: "serif" },
  { name: "Constantia", fallback: "serif" },
  { name: "Rockwell", fallback: "serif" },
  { name: "Courier New", fallback: "monospace" },
  { name: "Consolas", fallback: "monospace" },
  { name: "Lucida Console", fallback: "monospace" },
  { name: "Monaco", fallback: "monospace" },
  { name: "Comic Sans MS", fallback: "cursive" },
  { name: "Brush Script MT", fallback: "cursive" },
];

const FONT_SIZE_PRESETS = [
  "8", "9", "10", "11", "12", "14", "16", "18", "20", "24", "28", "32", "36",
  "48", "60", "72",
];

/** Compact font-size control: a typeable field plus a small preset dropdown. */
function FontSizeControl({ apply }: { apply: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      className="flex h-8 items-center rounded-md border border-gray-200 bg-white pl-1 text-sm text-gray-600 focus-within:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
    >
      <input
        type="text"
        inputMode="numeric"
        aria-label="Font size"
        title="Font size"
        placeholder="Size"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ""))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            apply(value);
          }
        }}
        onBlur={() => apply(value)}
        className="w-8 bg-transparent text-center outline-none placeholder:text-gray-400"
      />
      <button
        type="button"
        aria-label="Font size presets"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className="flex h-full w-5 items-center justify-center rounded-r-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <ChevronDown size={13} />
      </button>
      <PortalMenu
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={ref}
        align="right"
      >
        <div className="no-scrollbar max-h-56 w-14 overflow-y-auto overscroll-contain rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {FONT_SIZE_PRESETS.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setValue(s);
                apply(s);
                setOpen(false);
              }}
              className="block w-full px-3 py-1 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {s}
            </button>
          ))}
        </div>
      </PortalMenu>
    </div>
  );
}

/** Font-family dropdown: a scrollable list (scrollbar hidden) of common fonts,
 *  each previewed in its own face. */
function FontFamilyControl({ apply }: { apply: (stack: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={ref}
        type="button"
        title="Font"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className={`${selectClass} flex w-full items-center justify-between gap-1`}
      >
        <span>Font</span>
        <ChevronDown size={13} />
      </button>
      <PortalMenu open={open} onClose={() => setOpen(false)} anchorRef={ref}>
        <div className="no-scrollbar max-h-72 w-48 overflow-y-auto overscroll-contain rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {FONT_FAMILIES.map((f) => {
            const stack = `"${f.name}", ${f.fallback}`;
            return (
              <button
                key={f.name}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  apply(stack);
                  setOpen(false);
                }}
                style={{ fontFamily: stack }}
                className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                {f.name}
              </button>
            );
          })}
        </div>
      </PortalMenu>
    </>
  );
}

function TableGridPicker({
  onPick,
}: {
  onPick: (rows: number, cols: number) => void;
}) {
  const MAX_ROWS = 8;
  const MAX_COLS = 10;
  const [hover, setHover] = useState({ rows: 0, cols: 0 });
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
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
                  ? "border-blue-500 bg-blue-100 dark:bg-blue-500/30"
                  : "border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-700"
              }`}
            />
          );
        })}
      </div>
      <div className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
        {hover.rows && hover.cols
          ? `${hover.cols} × ${hover.rows}`
          : "Insert table"}
      </div>
    </div>
  );
}

export type EditorHandle = {
  replaceSelectionOrCurrentBlock: (text: string) => void;
  replaceRange: (range: { from: number; to: number }, text: string) => void;
  applyAssistantActions: (actions: AssistantEditorAction[]) => void;
};

export type AssistantEditorAction =
  | { type: "insert_table"; rows: string[][]; position?: "cursor" | "end" }
  | { type: "highlight_target"; color?: string }
  | { type: "highlight_matches"; terms: string[]; color?: string }
  | { type: "format_target"; marks: Array<"bold" | "italic"> }
  | { type: "set_heading"; level: 1 | 2 | 3 }
  | { type: "insert_text"; text: string; position?: "cursor" | "end" };

type EditorProps = {
  onDocumentChange?: (document: {
    text: string;
    html: string;
    selectionText: string;
    currentBlockText: string;
    targetRange: { from: number; to: number } | null;
  }) => void;
};

type InlineContent = { type: "text"; text: string } | { type: "hardBreak" };
type TextBlockContent =
  | {
      type: "paragraph";
      content?: InlineContent[];
    }
  | {
      type: "heading";
      attrs: { level: 1 | 2 | 3 };
      content?: InlineContent[];
    };

function linesToInlineContent(lines: string[]) {
  const content = lines.flatMap((line, index) => {
    const nodes: InlineContent[] = [];
    if (index > 0) nodes.push({ type: "hardBreak" });
    if (line) nodes.push({ type: "text", text: line });
    return nodes;
  });

  return content.length > 0 ? content : undefined;
}

function textToEditorContent(text: string) {
  const blocks: TextBlockContent[] = [];
  let paragraphLines: string[] = [];

  function flushParagraph() {
    if (!paragraphLines.some((line) => line.trim())) {
      paragraphLines = [];
      return;
    }

    blocks.push({
      type: "paragraph",
      content: linesToInlineContent(paragraphLines),
    });
    paragraphLines = [];
  }

  for (const rawLine of text.trim().split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line.trim());

    if (headingMatch) {
      flushParagraph();
      blocks.push({
        type: "heading",
        attrs: { level: headingMatch[1].length as 1 | 2 | 3 },
        content: linesToInlineContent([headingMatch[2].trim()]),
      });
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    paragraphLines.push(line);
  }

  flushParagraph();
  return blocks;
}

// Prose styling for exported / printed documents. Mirrors the `.editor-content`
// rules in globals.css (light theme) so a Print or HTML export looks the same
// as the editor — including borderless two-column "layout tables" and the
// section rule under h2 headings.
const EXPORT_STYLES = `
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    max-width: 720px; margin: 48px auto; padding: 0 24px;
    color: #111; font-size: 15px; line-height: 1.5; }
  h1 { font-size: 1.7rem; font-weight: 700; line-height: 1.2; margin: 0.5em 0 0.25em; }
  h2 { font-size: 1.2rem; font-weight: 700; line-height: 1.25; margin: 0.7em 0 0.2em;
    border-bottom: 1px solid #d1d5db; padding-bottom: 0.12em; }
  h3 { font-size: 1.05rem; font-weight: 700; line-height: 1.3; margin: 0.6em 0 0.15em; }
  p { margin: 0.35em 0; }
  a { color: #2563eb; text-decoration: underline; }
  ul { list-style: disc; padding-left: 1.5rem; margin: 0.35em 0; }
  ol { list-style: decimal; padding-left: 1.5rem; margin: 0.35em 0; }
  li { margin: 0.1em 0; }
  li > p { margin: 0; }
  blockquote { border-left: 3px solid #d1d5db; padding-left: 1em; color: #4b5563; margin: 1em 0; }
  hr { border: none; border-top: 1px solid #d1d5db; margin: 1.5em 0; }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  th, td { border: 1px solid #d1d5db; padding: 6px 10px; vertical-align: top; }
  th { background: #f3f4f6; font-weight: 600; text-align: left; }
  table.layout-table { table-layout: auto; margin: 0.2em 0; }
  table.layout-table th, table.layout-table td { border: none; padding: 0; }
  table.layout-table td:last-child { width: 1%; white-space: nowrap; text-align: right; padding-left: 1.5em; }
  table.layout-table p { margin: 0; }
  [data-type=frame] { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px 16px; }
`;

function buildExportDocument(title: string, bodyHtml: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${EXPORT_STYLES}</style></head><body>${bodyHtml}</body></html>`;
}

// ── Markdown export ──────────────────────────────────────────
// Serialize the editor's ProseMirror JSON to Markdown.
type PMNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
};

function inlineToMarkdown(nodes: PMNode[] = []): string {
  return nodes
    .map((node) => {
      if (node.type === "hardBreak") return "  \n";
      if (node.type !== "text") return inlineToMarkdown(node.content);
      let text = node.text ?? "";
      const marks = node.marks ?? [];
      const has = (type: string) => marks.some((mark) => mark.type === type);
      if (has("code")) text = "`" + text + "`";
      if (has("bold")) text = `**${text}**`;
      if (has("italic")) text = `*${text}*`;
      const link = marks.find((mark) => mark.type === "link");
      if (link?.attrs?.href) text = `[${text}](${String(link.attrs.href)})`;
      return text;
    })
    .join("");
}

function blocksToMarkdown(nodes: PMNode[] = [], depth = 0): string {
  const out: string[] = [];
  for (const node of nodes) {
    switch (node.type) {
      case "heading":
        out.push(
          "#".repeat(Number(node.attrs?.level ?? 1)) +
            " " +
            inlineToMarkdown(node.content)
        );
        break;
      case "paragraph":
        out.push(inlineToMarkdown(node.content));
        break;
      case "bulletList":
      case "orderedList": {
        const ordered = node.type === "orderedList";
        const indent = "  ".repeat(depth);
        (node.content ?? []).forEach((item, index) => {
          const marker = ordered ? `${index + 1}.` : "-";
          const inner = blocksToMarkdown(item.content, depth + 1).trim();
          const lines = inner.split("\n");
          out.push(`${indent}${marker} ${lines.join(`\n${indent}  `)}`);
        });
        break;
      }
      case "blockquote":
        out.push(
          blocksToMarkdown(node.content)
            .split("\n")
            .map((line) => `> ${line}`)
            .join("\n")
        );
        break;
      case "horizontalRule":
        out.push("---");
        break;
      case "table": {
        const rows = (node.content ?? []).map((row) =>
          (row.content ?? []).map((cell) =>
            blocksToMarkdown(cell.content).replace(/\s*\n\s*/g, " ").trim()
          )
        );
        if (rows.length) {
          const cols = rows[0].length;
          out.push(`| ${rows[0].join(" | ")} |`);
          out.push(`| ${Array(cols).fill("---").join(" | ")} |`);
          for (const row of rows.slice(1)) out.push(`| ${row.join(" | ")} |`);
        }
        break;
      }
      case "image":
        if (node.attrs?.src) out.push(`![](${String(node.attrs.src)})`);
        break;
      default:
        if (node.content) out.push(blocksToMarkdown(node.content, depth));
    }
  }
  return out.join("\n\n");
}

function editorMarkdown(doc: PMNode): string {
  return `${blocksToMarkdown(doc.content).trim()}\n`;
}

function tableContent(rows: string[][]) {
  return {
    type: "table",
    content: rows.map((row) => ({
      type: "tableRow",
      content: row.map((cell) => ({
        type: "tableCell",
        content: [
          {
            type: "paragraph",
            content: cell ? [{ type: "text", text: cell }] : undefined,
          },
        ],
      })),
    })),
  };
}

const Editor = forwardRef<EditorHandle, EditorProps>(function Editor({
  onDocumentChange,
}, ref) {
  const [showOutline, setShowOutline] = useState(true);
  const [showFind, setShowFind] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [showInsert, setShowInsert] = useState(false);
  const [imageMenu, setImageMenu] = useState<{ x: number; y: number } | null>(
    null
  );
  const [imageToolbar, setImageToolbar] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [listening, setListening] = useState(false);
  const [importing, setImporting] = useState(false);
  const [, setTick] = useState(0); // force re-render on editor changes

  const recognitionRef = useRef<unknown>(null);
  const findInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const tableBtnRef = useRef<HTMLDivElement>(null);
  const insertBtnRef = useRef<HTMLDivElement>(null);
  const exportBtnRef = useRef<HTMLDivElement>(null);

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
      EditableImage.configure({ allowBase64: true }),
      // Keep the table's `class` attribute through copy/paste and setContent so
      // imported two-column rows can opt into the borderless ".layout-table"
      // styling (see globals.css).
      Table.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            class: {
              default: null,
              parseHTML: (element) => element.getAttribute("class"),
              renderHTML: (attributes) =>
                attributes.class ? { class: attributes.class } : {},
            },
          };
        },
      }).configure({ resizable: true }),
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
          "editor-content min-h-[60vh] text-[15px] leading-[1.5] text-gray-800 outline-none dark:text-gray-100",
      },
      handleDOMEvents: {
        contextmenu: (view, event) => {
          const target = event.target as HTMLElement | null;
          const image = target?.closest(".editor-content img");
          if (!image) {
            setImageMenu(null);
            return false;
          }

          event.preventDefault();
          const pos = view.posAtDOM(image, 0);
          view.dispatch(
            view.state.tr.setSelection(
              NodeSelection.create(view.state.doc, pos)
            )
          );
          setImageMenu({ x: event.clientX, y: event.clientY });
          return true;
        },
      },
    },
  });

  useImperativeHandle(
    ref,
    () => ({
      replaceRange(range: { from: number; to: number }, text: string) {
        if (!editor) return;
        const replacement = text.trim();
        if (!replacement) return;

        editor
          .chain()
          .focus()
          .insertContentAt(range, textToEditorContent(replacement))
          .run();
      },
      applyAssistantActions(actions: AssistantEditorAction[]) {
        if (!editor) return;

        for (const action of actions) {
          const { selection } = editor.state;
          const targetRange =
            selection.empty && selection.$from.depth > 0
              ? {
                  from: selection.$from.before(selection.$from.depth),
                  to: selection.$from.after(selection.$from.depth),
                }
              : selection.empty
              ? null
              : { from: selection.from, to: selection.to };
          const insertAt =
            action.type === "insert_table" || action.type === "insert_text"
              ? action.position === "end"
                ? editor.state.doc.content.size
                : selection.to
              : selection.to;

          if (action.type === "insert_table" && action.rows.length) {
            editor
              .chain()
              .focus()
              .insertContentAt(insertAt, tableContent(action.rows))
              .run();
            continue;
          }

          if (action.type === "insert_text" && action.text.trim()) {
            editor
              .chain()
              .focus()
              .insertContentAt(insertAt, textToEditorContent(action.text))
              .run();
            continue;
          }

          if (action.type === "highlight_matches") {
            const markType = editor.schema.marks.highlight;
            if (!markType) continue;

            const terms = action.terms
              .map((term) => term.trim())
              .filter(Boolean)
              .sort((a, b) => b.length - a.length);
            if (!terms.length) continue;

            let tr = editor.state.tr;
            let changed = false;
            editor.state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return;

              const text = node.text;
              const lowerText = text.toLowerCase();
              for (const term of terms) {
                const lowerTerm = term.toLowerCase();
                let index = lowerText.indexOf(lowerTerm);
                while (index !== -1) {
                  tr = tr.addMark(
                    pos + index,
                    pos + index + term.length,
                    markType.create({ color: action.color ?? "#fef08a" })
                  );
                  changed = true;
                  index = lowerText.indexOf(lowerTerm, index + lowerTerm.length);
                }
              }
            });

            if (changed) {
              editor.view.dispatch(tr);
              editor.commands.focus();
            }
            continue;
          }

          if (!targetRange) continue;

          if (action.type === "highlight_target") {
            editor
              .chain()
              .focus()
              .setTextSelection(targetRange)
              .setHighlight({ color: action.color ?? "#fef08a" })
              .run();
            continue;
          }

          if (action.type === "format_target") {
            let chain = editor.chain().focus().setTextSelection(targetRange);
            if (action.marks.includes("bold")) chain = chain.toggleBold();
            if (action.marks.includes("italic")) chain = chain.toggleItalic();
            chain.run();
            continue;
          }

          if (action.type === "set_heading") {
            editor
              .chain()
              .focus()
              .setTextSelection(targetRange)
              .toggleHeading({ level: action.level })
              .run();
          }
        }
      },
      replaceSelectionOrCurrentBlock(text: string) {
        if (!editor) return;
        const replacement = text.trim();
        if (!replacement) return;

        const { selection } = editor.state;
        let from = selection.from;
        let to = selection.to;

        if (selection.empty && selection.$from.depth > 0) {
          from = selection.$from.before(selection.$from.depth);
          to = selection.$from.after(selection.$from.depth);
        }

        editor
          .chain()
          .focus()
          .insertContentAt({ from, to }, textToEditorContent(replacement))
          .run();
      },
    }),
    [editor]
  );

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      setTick((t) => t + 1);

      const { selection } = editor.state;
      const selectionText = selection.empty
        ? ""
        : editor.state.doc.textBetween(selection.from, selection.to, "\n");
      const currentBlockText =
        selection.empty && selection.$from.depth > 0
          ? selection.$from.parent.textContent
          : "";
      const targetRange =
        selection.empty && selection.$from.depth > 0
          ? {
              from: selection.$from.before(selection.$from.depth),
              to: selection.$from.after(selection.$from.depth),
            }
          : selection.empty
          ? null
          : { from: selection.from, to: selection.to };
      onDocumentChange?.({
        text: editor.getText(),
        html: editor.getHTML(),
        selectionText,
        currentBlockText,
        targetRange,
      });

      if (
        selection instanceof NodeSelection &&
        selection.node.type.name === "image"
      ) {
        const dom = editor.view.nodeDOM(selection.from);
        if (dom instanceof HTMLElement) {
          const rect = dom.getBoundingClientRect();
          setImageToolbar({
            x: rect.left + rect.width / 2,
            y: Math.max(8, rect.top - 46),
          });
          return;
        }
      }

      setImageToolbar(null);
      setImageMenu(null);
    };
    editor.on("transaction", update);
    return () => {
      editor.off("transaction", update);
    };
  }, [editor, onDocumentChange]);

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

  function openImagePicker() {
    imageInputRef.current?.click();
  }

  // ── Import a document from disk (.pdf, .docx, .txt, .md, .html) ─────
  // Reconstruct structure from a PDF and return HTML. A PDF stores positioned
  // glyphs, not semantic structure, so this is a best-effort rebuild:
  //   • glyph runs are grouped into visual lines (pdf.js marks line ends);
  //   • the real font (read from page.commonObjs, not the generic family in
  //     getTextContent styles) gives reliable bold/italic flags;
  //   • font size relative to the body size detects headings;
  //   • leading markers detect bullet lists;
  //   • a wide horizontal gap inside a line (title … date) becomes a
  //     borderless two-column "layout table" — it stays editable and reflows;
  //   • lines centred on the page keep their centring.
  // The worker is served from /public so it loads reliably regardless of
  // bundler.
  async function extractPdfHtml(data: ArrayBuffer) {
    // x = left edge, w = advance width — used to find two-column gaps.
    type Run = { text: string; bold: boolean; italic: boolean; x: number; w: number };
    type Line = {
      x: number;
      size: number;
      centered: boolean;
      runs: Run[];
      text: string;
    };

    const escapeHtml = (value: string) =>
      value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const runsToHtml = (runs: Run[]) =>
      runs
        .map((run) => {
          const text = escapeHtml(run.text);
          if (!text) return "";
          if (run.bold) return `<strong>${text}</strong>`;
          if (run.italic) return `<em>${text}</em>`;
          return text;
        })
        .join("");

    const boldRe = /bold|black|heavy|semibold|demi|cmbx|cmb\d|[-_ ]bd\b/i;
    const italicRe = /italic|oblique|cmti|cmsl|[-_ ]it\b/i;

    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;

    // Pass 1: group glyph runs into visual lines, tracking font size, left
    // edge, page-centring, and the real bold/italic flags of each run.
    const lines: Line[] = [];
    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i);
      const pageWidth = page.getViewport({ scale: 1 }).width;
      // getOperatorList parses the embedded fonts so commonObjs can resolve
      // each font's real name and bold/italic flags (the styles map only has
      // a generic family like "serif").
      await page.getOperatorList();
      const content = await page.getTextContent();

      const fontFlags = (id?: string) => {
        if (!id) return { bold: false, italic: false };
        try {
          if (page.commonObjs.has(id)) {
            const font = page.commonObjs.get(id) as {
              name?: string;
              bold?: boolean;
              italic?: boolean;
              black?: boolean;
            };
            const name = font?.name ?? "";
            return {
              bold: Boolean(font?.bold || font?.black) || boldRe.test(name),
              italic: Boolean(font?.italic) || italicRe.test(name),
            };
          }
        } catch {
          // commonObjs entry not ready — fall through to "no styling".
        }
        return { bold: false, italic: false };
      };

      let current: Line | null = null;
      let minX = 0;
      let maxX = 0;

      const flush = () => {
        if (!current) return;
        current.text = current.runs.map((run) => run.text).join("");
        if (current.text.trim()) {
          const width = maxX - minX;
          current.x = minX;
          current.centered =
            width > 0 &&
            width < pageWidth * 0.85 &&
            minX > pageWidth * 0.12 &&
            Math.abs(minX - (pageWidth - maxX)) < pageWidth * 0.12;
          lines.push(current);
        }
        current = null;
      };

      for (const item of content.items) {
        if (!("str" in item)) continue;
        const it = item as {
          str: string;
          transform: number[];
          width?: number;
          fontName?: string;
          hasEOL?: boolean;
        };
        if (it.str) {
          const size = Math.hypot(it.transform[2], it.transform[3]) || 0;
          const x = it.transform[4];
          const right = x + (it.width ?? 0);
          const { bold, italic } = fontFlags(it.fontName);
          if (!current) {
            current = { x, size, centered: false, runs: [], text: "" };
            minX = x;
            maxX = right;
          } else {
            current.size = Math.max(current.size, size);
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, right);
          }
          current.runs.push({ text: it.str, bold, italic, x, w: it.width ?? 0 });
        }
        if (it.hasEOL) flush();
      }
      flush();
    }

    if (!lines.length) return "";

    // Body font size = the most common rounded line height. Anything notably
    // larger is treated as a heading.
    const sizeFreq = new Map<number, number>();
    for (const line of lines) {
      const key = Math.round(line.size);
      sizeFreq.set(key, (sizeFreq.get(key) ?? 0) + 1);
    }
    let bodySize = 12;
    let bestCount = -1;
    for (const [size, count] of sizeFreq) {
      if (count > bestCount) {
        bestCount = count;
        bodySize = size;
      }
    }
    bodySize = Math.max(bodySize, 1);

    const bulletRe = /^\s*(?:[•‣◦⁃∙·▪●]\s*|[-*]\s+)/;

    const headingLevel = (line: Line): 0 | 1 | 2 | 3 => {
      const text = line.text.trim();
      if (!text || bulletRe.test(line.text)) return 0;
      const ratio = line.size / bodySize;
      if (ratio >= 1.55) return 1;
      if (ratio >= 1.28) return 2;
      if (ratio >= 1.1) return 3;
      // A short, fully bold standalone line (no right-hand date column, which
      // is handled separately) reads as a section heading even at body size —
      // e.g. resume section titles like "Education".
      const allBold =
        line.runs.length > 0 &&
        line.runs.every((run) => !run.text.trim() || run.bold);
      if (allBold && text.length <= 60) return 2;
      return 0;
    };

    const stripBullet = (runs: Run[]): Run[] => {
      const copy = runs.map((run) => ({ ...run }));
      for (const run of copy) {
        if (!run.text.trim()) continue;
        // The marker may be its own run, so strip it then stop.
        run.text = run.text.replace(bulletRe, "");
        break;
      }
      return copy;
    };

    // A wide horizontal gap marks a left/right two-column row (e.g. a job
    // title with a right-aligned date). The gap is usually a single very wide
    // whitespace run (from LaTeX \hfill / Word tab stops), occasionally a
    // positional jump between runs. Returns the left/right run groups, or null.
    const columnSplit = (line: Line): { left: Run[]; right: Run[] } | null => {
      if (line.runs.length < 2) return null;
      const threshold = line.size * 3;
      for (let k = 1; k < line.runs.length; k += 1) {
        const prev = line.runs[k - 1];
        const run = line.runs[k];
        const wideSpace = !run.text.trim() && run.w > threshold;
        const positionalGap = run.x - (prev.x + prev.w) > threshold;
        if (!wideSpace && !positionalGap) continue;
        // Drop the separator run itself when it's the wide space.
        const left = line.runs.slice(0, k);
        const right = line.runs.slice(wideSpace ? k + 1 : k);
        if (left.some((r) => r.text.trim()) && right.some((r) => r.text.trim())) {
          return { left, right };
        }
      }
      return null;
    };

    // Pass 2: emit HTML, grouping consecutive bullets into a list and folding
    // hanging-indent continuation lines back into their bullet.
    const out: string[] = [];
    let listOpen = false;
    const closeList = () => {
      if (listOpen) {
        out.push("</ul>");
        listOpen = false;
      }
    };
    const align = (centered: boolean) =>
      centered ? ' style="text-align: center"' : "";

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      if (bulletRe.test(line.text)) {
        if (!listOpen) {
          out.push("<ul>");
          listOpen = true;
        }
        let itemRuns = stripBullet(line.runs);
        const bulletX = line.x;
        let j = i + 1;
        while (j < lines.length) {
          const next = lines[j];
          // Stop at the next bullet, a heading, or a line that dedents back to
          // (or past) the bullet marker — those start new content.
          if (headingLevel(next) || bulletRe.test(next.text)) break;
          if (next.x < bulletX - 1) break;
          itemRuns = [
            ...itemRuns,
            { text: " ", bold: false, italic: false, x: next.x, w: 0 },
            ...next.runs,
          ];
          j += 1;
        }
        out.push(`<li>${runsToHtml(itemRuns)}</li>`);
        i = j;
        continue;
      }

      // Two-column row (title left / date right). Checked before headings so a
      // bold "title … date" line becomes a row, not a single heading.
      const cols = columnSplit(line);
      if (cols) {
        closeList();
        const left = runsToHtml(cols.left).trim();
        const right = runsToHtml(cols.right).trim();
        out.push(
          '<table class="layout-table"><tbody><tr>' +
            `<td><p>${left}</p></td>` +
            `<td><p>${right}</p></td>` +
            "</tr></tbody></table>"
        );
        i += 1;
        continue;
      }

      const level = headingLevel(line);
      if (level) {
        closeList();
        out.push(
          `<h${level}${align(line.centered)}>${runsToHtml(line.runs)}</h${level}>`
        );
        i += 1;
        continue;
      }

      closeList();
      out.push(`<p${align(line.centered)}>${runsToHtml(line.runs)}</p>`);
      i += 1;
    }
    closeList();

    return out.join("");
  }

  async function importDocument(e: ChangeEvent<HTMLInputElement>) {
    if (!editor) return;
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const hasContent = editor.getText().trim().length > 0;
    if (
      hasContent &&
      !window.confirm("Importing replaces the current document. Continue?")
    ) {
      return;
    }

    const name = file.name.toLowerCase();
    setImporting(true);
    try {
      if (name.endsWith(".docx")) {
        // Word → HTML, preserving headings, lists, tables, bold/italic, etc.
        const mammoth = (await import("mammoth")).default;
        const { value } = await mammoth.convertToHtml({
          arrayBuffer: await file.arrayBuffer(),
        });
        editor.chain().focus().setContent(value).run();
      } else if (name.endsWith(".pdf")) {
        const html = await extractPdfHtml(await file.arrayBuffer());
        editor.chain().focus().setContent(html || "<p></p>").run();
      } else if (name.endsWith(".html") || name.endsWith(".htm")) {
        editor.chain().focus().setContent(await file.text()).run();
      } else {
        // .txt, .md, and other plain-text files
        editor
          .chain()
          .focus()
          .setContent(textToEditorContent(await file.text()))
          .run();
      }
    } catch (error) {
      window.alert(
        `Could not import ${file.name}: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      );
    } finally {
      setImporting(false);
    }
  }

  function addImageFromFile(e: ChangeEvent<HTMLInputElement>) {
    if (!editor) return;
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;
      if (typeof src === "string") {
        editor.chain().focus().setImage({ src, alt: file.name }).run();
      }
    };
    reader.readAsDataURL(file);
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

  // Apply a typed/selected font size (in px). Ignores invalid input.
  function applyFontSize(value: string) {
    const size = parseInt(value, 10);
    if (!Number.isNaN(size) && size > 0 && size <= 400) {
      editor?.chain().focus().setFontSize(`${size}px`).run();
    }
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

  const imageActive = Boolean(editor?.isActive("image"));
  const imageAttrs = imageActive ? editor?.getAttributes("image") : null;
  const imageHeight = Number(imageAttrs?.height) || 240;
  const imageOpacity = Number(imageAttrs?.opacity) || 100;
  const imageRadius = Number(imageAttrs?.radius) || 0;
  const imageRotate = Number(imageAttrs?.rotate) || 0;
  const imageCropX = Number(imageAttrs?.cropX) || 50;
  const imageCropY = Number(imageAttrs?.cropY) || 50;
  const imageFit = ((imageAttrs?.fit as ImageFit | undefined) ??
    "contain") as ImageFit;
  const imageAlign = ((imageAttrs?.align as ImageAlign | undefined) ??
    "left") as ImageAlign;

  function updateImageAttrs(attrs: Record<string, number | string | null>) {
    editor?.chain().updateAttributes("image", attrs).run();
  }

  function resetImageAttrs() {
    updateImageAttrs({
      width: null,
      height: null,
      opacity: 100,
      fit: "contain",
      align: "left",
      cropX: 50,
      cropY: 50,
      radius: 6,
      rotate: 0,
    });
  }

  function openImageOptions() {
    if (!imageToolbar) return;
    setImageMenu({
      x: Math.max(12, imageToolbar.x - 128),
      y: imageToolbar.y + 40,
    });
  }

  // ── Dictation (Web Speech API) ─────────────────────────
  // Feature-detect only after mount so the first client render matches the
  // server (both start as "unsupported"), avoiding a hydration mismatch.
  const [dictationSupported, setDictationSupported] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDictationSupported(
        "SpeechRecognition" in window || "webkitSpeechRecognition" in window
      );
    }, 0);
    return () => window.clearTimeout(timer);
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
    win.document.write(buildExportDocument("Document", editor.getHTML()));
    win.document.close();
    win.focus();
    win.print();
  }

  function downloadBlob(filename: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function download(filename: string, content: string, type: string) {
    downloadBlob(filename, new Blob([content], { type }));
  }

  // Word export: a Word-flavoured HTML document (.doc) that Microsoft Word and
  // Google Docs open with formatting intact. Uses the Office namespaces + the
  // shared export styles. Dependency-free, so nothing to bundle.
  function exportWord() {
    if (!editor) return;
    const header =
      "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
      "xmlns:w='urn:schemas-microsoft-com:office:word' " +
      "xmlns='http://www.w3.org/TR/REC-html40'>" +
      `<head><meta charset="utf-8"><style>${EXPORT_STYLES}</style></head><body>`;
    // Leading BOM so Word detects UTF-8.
    const doc = `﻿${header}${editor.getHTML()}</body></html>`;
    downloadBlob("document.doc", new Blob([doc], { type: "application/msword" }));
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
          // Only translate vertical wheel into horizontal toolbar scroll when
          // the wheel happens inside the toolbar itself. Portaled dropdowns are
          // React children of the toolbar, so without this guard their wheel
          // events would bubble here and scroll the toolbar.
          if (
            toolbarRef.current &&
            e.deltaY !== 0 &&
            toolbarRef.current.contains(e.target as Node)
          ) {
            toolbarRef.current.scrollLeft += e.deltaY;
          }
        }}
        className="toolbar-scroll flex shrink-0 items-stretch gap-x-1.5 overflow-x-auto border-b border-gray-200 px-3 py-2 [&>*]:shrink-0 dark:border-gray-800"
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
          <FontFamilyControl
            apply={(stack) => editor?.chain().focus().setFontFamily(stack).run()}
          />
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
            <FontSizeControl apply={applyFontSize} />
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
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                          : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
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
                      className="rounded px-3 py-1 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
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
              className="relative flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-md px-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
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
              className="relative flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-md px-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
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
          <div ref={tableBtnRef}>
            <CmdBtn
              title="Insert table"
              label="Table"
              active={showTablePicker}
              onClick={() => setShowTablePicker((v) => !v)}
            >
              <TableIcon size={18} />
            </CmdBtn>
            <PortalMenu
              open={showTablePicker}
              onClose={() => setShowTablePicker(false)}
              anchorRef={tableBtnRef}
            >
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
            </PortalMenu>
          </div>

          <div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={addImageFromFile}
              className="hidden"
            />
            <CmdBtn title="Insert image" label="Image" onClick={openImagePicker}>
              <ImageIcon size={18} />
            </CmdBtn>
          </div>

          <div ref={insertBtnRef}>
            <CmdBtn
              title="Insert element"
              label="Insert"
              active={showInsert}
              onClick={() => setShowInsert((v) => !v)}
            >
              <Plus size={18} />
            </CmdBtn>
            <PortalMenu
              open={showInsert}
              onClose={() => setShowInsert(false)}
              anchorRef={insertBtnRef}
            >
              <div className="w-44 rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <button
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                  onClick={() => {
                    editor?.chain().focus().toggleBlockquote().run();
                    setShowInsert(false);
                  }}
                >
                  <Quote size={15} /> Quote
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                  onClick={() => {
                    editor?.chain().focus().toggleFrame().run();
                    setShowInsert(false);
                  }}
                >
                  <FrameIcon size={15} /> Frame
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                  onClick={() => {
                    editor?.chain().focus().setHorizontalRule().run();
                    setShowInsert(false);
                  }}
                >
                  <Minus size={15} /> Horizontal line
                </button>
              </div>
            </PortalMenu>
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

        {/* Import / output (labeled) */}
        <div className="flex items-stretch gap-0.5">
          <input
            ref={importInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,.markdown,.html,.htm,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/html"
            onChange={importDocument}
            className="hidden"
          />
          <CmdBtn
            title="Import a PDF, Word (.docx), text, or HTML file"
            label={importing ? "Importing…" : "Import"}
            disabled={importing}
            onClick={() => importInputRef.current?.click()}
          >
            <Upload size={18} />
          </CmdBtn>
          <CmdBtn title="Print" label="Print" onClick={printDoc}>
            <Printer size={18} />
          </CmdBtn>
          <div ref={exportBtnRef}>
            <CmdBtn
              title="Export"
              label="Export"
              active={showExport}
              onClick={() => setShowExport((v) => !v)}
            >
              <Download size={18} />
            </CmdBtn>
            <PortalMenu
              open={showExport}
              onClose={() => setShowExport(false)}
              anchorRef={exportBtnRef}
              align="right"
            >
              <div className="w-52 rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <button
                  className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                  onClick={() => {
                    printDoc();
                    setShowExport(false);
                  }}
                >
                  Export as PDF
                </button>
                <button
                  className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                  onClick={() => {
                    exportWord();
                    setShowExport(false);
                  }}
                >
                  Export as Word (.doc)
                </button>
                <button
                  className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                  onClick={() => {
                    if (editor)
                      download(
                        "document.md",
                        editorMarkdown(editor.getJSON() as PMNode),
                        "text/markdown"
                      );
                    setShowExport(false);
                  }}
                >
                  Export as Markdown
                </button>
                <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                <button
                  className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                  onClick={() => {
                    if (editor)
                      download(
                        "document.html",
                        buildExportDocument("Document", editor.getHTML()),
                        "text/html"
                      );
                    setShowExport(false);
                  }}
                >
                  Export as HTML
                </button>
                <button
                  className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                  onClick={() => {
                    if (editor)
                      download("document.txt", editor.getText(), "text/plain");
                    setShowExport(false);
                  }}
                >
                  Export as Text
                </button>
              </div>
            </PortalMenu>
          </div>
        </div>
      </div>

      {/* ── Find & replace bar ────────────────────────────── */}
      {imageToolbar &&
        imageActive &&
        createPortal(
          <div
            className="fixed z-[94] flex -translate-x-1/2 items-center gap-1 rounded-md border border-gray-200 bg-white px-1.5 py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
            style={{ left: imageToolbar.x, top: imageToolbar.y }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              title="Fit whole image"
              onClick={() => updateImageAttrs({ fit: "contain", height: null })}
              className={`h-8 rounded px-2 text-xs font-medium ${
                imageFit === "contain"
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Fit
            </button>
            <button
              type="button"
              title="Crop image"
              onClick={() =>
                updateImageAttrs(
                  !imageAttrs?.height
                    ? { fit: "cover", height: imageHeight }
                    : { fit: "cover" }
                )
              }
              className={`h-8 rounded px-2 text-xs font-medium ${
                imageFit === "cover"
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Crop
            </button>
            <span className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />
            <button
              type="button"
              title="Align left"
              onClick={() => updateImageAttrs({ align: "left" })}
              className={`flex h-8 w-8 items-center justify-center rounded ${
                imageAlign === "left"
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              <AlignLeft size={15} />
            </button>
            <button
              type="button"
              title="Align center"
              onClick={() => updateImageAttrs({ align: "center" })}
              className={`flex h-8 w-8 items-center justify-center rounded ${
                imageAlign === "center"
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              <AlignCenter size={15} />
            </button>
            <button
              type="button"
              title="Align right"
              onClick={() => updateImageAttrs({ align: "right" })}
              className={`flex h-8 w-8 items-center justify-center rounded ${
                imageAlign === "right"
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              <AlignRight size={15} />
            </button>
            <span className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />
            <button
              type="button"
              title="Image options"
              onClick={openImageOptions}
              className="h-8 rounded px-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Options
            </button>
            <button
              type="button"
              title="Reset image"
              onClick={resetImageAttrs}
              className="h-8 rounded px-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Reset
            </button>
          </div>,
          document.body
        )}

      {imageMenu &&
        imageActive &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[95]"
              onMouseDown={() => setImageMenu(null)}
              onContextMenu={(e) => {
                e.preventDefault();
                setImageMenu(null);
              }}
            />
            <div
              className="fixed z-[96] w-64 rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-600 shadow-xl dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              style={{ left: imageMenu.x, top: imageMenu.y }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Image options
                </span>
                <button
                  type="button"
                  title="Close"
                  onClick={() => setImageMenu(null)}
                  className="flex h-7 w-7 items-center justify-center rounded text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  <X size={15} />
                </button>
              </div>

              <label className="mb-3 block">
                <span className="mb-1 block font-medium text-gray-700">
                  Opacity
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={imageOpacity}
                    onChange={(e) =>
                      updateImageAttrs({ opacity: Number(e.target.value) })
                    }
                    className="flex-1"
                  />
                  <span className="w-9 text-right tabular-nums">
                    {imageOpacity}%
                  </span>
                </div>
              </label>

              <label className="mb-3 block">
                <span className="mb-1 block font-medium text-gray-700">
                  Crop mode
                </span>
                <select
                  value={imageFit}
                  onChange={(e) =>
                    updateImageAttrs(
                      e.target.value === "cover" && !imageAttrs?.height
                        ? {
                            fit: e.target.value as ImageFit,
                            height: imageHeight,
                          }
                        : { fit: e.target.value as ImageFit }
                    )
                  }
                  className="h-8 w-full rounded border border-gray-300 bg-white px-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                >
                  <option value="contain">Fit whole image</option>
                  <option value="cover">Crop to box</option>
                  <option value="fill">Stretch to box</option>
                </select>
              </label>

              <div className="mb-3 grid grid-cols-2 gap-3">
                <label>
                  <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                    Crop X
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    disabled={imageFit !== "cover"}
                    value={imageCropX}
                    onChange={(e) =>
                      updateImageAttrs({ cropX: Number(e.target.value) })
                    }
                    className="w-full disabled:opacity-40"
                  />
                </label>
                <label>
                  <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                    Crop Y
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    disabled={imageFit !== "cover"}
                    value={imageCropY}
                    onChange={(e) =>
                      updateImageAttrs({ cropY: Number(e.target.value) })
                    }
                    className="w-full disabled:opacity-40"
                  />
                </label>
              </div>

              <label className="mb-3 block">
                <span className="mb-1 block font-medium text-gray-700">
                  Rounded corners
                </span>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={imageRadius}
                  onChange={(e) =>
                    updateImageAttrs({ radius: Number(e.target.value) })
                  }
                  className="w-full"
                />
              </label>

              <label className="mb-3 block">
                <span className="mb-1 block font-medium text-gray-700">
                  Rotate
                </span>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={imageRotate}
                  onChange={(e) =>
                    updateImageAttrs({ rotate: Number(e.target.value) })
                  }
                  className="w-full"
                />
              </label>

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                <button
                  type="button"
                  onClick={resetImageAttrs}
                  className="h-8 rounded border border-gray-300 bg-white px-3 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Reset
                </button>
              </div>
            </div>
          </>,
          document.body
        )}

      {showFind && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
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
            className="h-8 w-44 rounded border border-gray-300 bg-white px-2 text-sm outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
          <span className="min-w-14 text-xs text-gray-500 dark:text-gray-400">
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
            className="h-8 w-44 rounded border border-gray-300 bg-white px-2 text-sm outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
          <button
            disabled={!matchCount}
            onClick={() => editor?.chain().focus().replaceCurrent().run()}
            className="h-8 rounded border border-gray-300 bg-white px-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Replace
          </button>
          <button
            disabled={!matchCount}
            onClick={() => editor?.chain().focus().replaceAll().run()}
            className="h-8 rounded border border-gray-300 bg-white px-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Replace all
          </button>
          <button
            title="Close"
            onClick={() => setShowFind(false)}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Body: outline + writing surface ───────────────── */}
      <div className="flex min-h-0 flex-1">
        {showOutline && (
          <nav className="w-56 shrink-0 overflow-y-auto border-r border-gray-100 bg-gray-50/60 px-3 py-4 dark:border-gray-800 dark:bg-gray-900/40">
            <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Outline
            </div>
            {headings.length === 0 ? (
              <p className="px-1 text-xs text-gray-400 dark:text-gray-500">
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
                      className="block w-full truncate rounded py-1 pr-1.5 text-left text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                    >
                      {h.text}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </nav>
        )}

        <div className="flex-1 overflow-y-auto bg-gray-200 dark:bg-gray-950">
          <div className="mx-auto my-8 min-h-[1056px] w-full max-w-[816px] rounded-sm bg-white px-[64px] py-[56px] shadow-lg dark:bg-gray-900">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
});

export default Editor;

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
