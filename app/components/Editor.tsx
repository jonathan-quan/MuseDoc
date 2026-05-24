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
        className="flex h-8 items-center gap-0.5 rounded-md border border-gray-200 bg-white px-1.5 text-gray-600 hover:bg-gray-50"
      >
        {icon}
        <ChevronDown size={13} />
      </button>
      <PortalMenu open={open} onClose={() => setOpen(false)} anchorRef={btnRef}>
        <div className="rounded-md border border-gray-200 bg-white p-1 shadow-lg">
          {children(() => setOpen(false))}
        </div>
      </PortalMenu>
    </>
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
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
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

function textToParagraphContent(text: string) {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => ({
      type: "paragraph",
      content: paragraph.split("\n").flatMap((line, index) => {
        const content: Array<{ type: string; text?: string }> = [];
        if (index > 0) content.push({ type: "hardBreak" });
        if (line) content.push({ type: "text", text: line });
        return content;
      }),
    }));
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
  const [, setTick] = useState(0); // force re-render on editor changes

  const recognitionRef = useRef<unknown>(null);
  const findInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
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
          .insertContentAt(range, textToParagraphContent(replacement))
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
              .insertContentAt(insertAt, textToParagraphContent(action.text))
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
          .insertContentAt({ from, to }, textToParagraphContent(replacement))
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
              <div className="w-44 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
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

        {/* Output (labeled) */}
        <div className="flex items-stretch gap-0.5">
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
              <div className="w-44 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
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
            </PortalMenu>
          </div>
        </div>
      </div>

      {/* ── Find & replace bar ────────────────────────────── */}
      {imageToolbar &&
        imageActive &&
        createPortal(
          <div
            className="fixed z-[94] flex -translate-x-1/2 items-center gap-1 rounded-md border border-gray-200 bg-white px-1.5 py-1 shadow-lg"
            style={{ left: imageToolbar.x, top: imageToolbar.y }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              title="Fit whole image"
              onClick={() => updateImageAttrs({ fit: "contain", height: null })}
              className={`h-8 rounded px-2 text-xs font-medium ${
                imageFit === "contain"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
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
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Crop
            </button>
            <span className="mx-1 h-5 w-px bg-gray-200" />
            <button
              type="button"
              title="Align left"
              onClick={() => updateImageAttrs({ align: "left" })}
              className={`flex h-8 w-8 items-center justify-center rounded ${
                imageAlign === "left"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
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
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
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
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <AlignRight size={15} />
            </button>
            <span className="mx-1 h-5 w-px bg-gray-200" />
            <button
              type="button"
              title="Image options"
              onClick={openImageOptions}
              className="h-8 rounded px-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
            >
              Options
            </button>
            <button
              type="button"
              title="Reset image"
              onClick={resetImageAttrs}
              className="h-8 rounded px-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
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
              className="fixed z-[96] w-64 rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-600 shadow-xl"
              style={{ left: imageMenu.x, top: imageMenu.y }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">
                  Image options
                </span>
                <button
                  type="button"
                  title="Close"
                  onClick={() => setImageMenu(null)}
                  className="flex h-7 w-7 items-center justify-center rounded text-gray-500 hover:bg-gray-100"
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
                  className="h-8 w-full rounded border border-gray-300 bg-white px-2"
                >
                  <option value="contain">Fit whole image</option>
                  <option value="cover">Crop to box</option>
                  <option value="fill">Stretch to box</option>
                </select>
              </label>

              <div className="mb-3 grid grid-cols-2 gap-3">
                <label>
                  <span className="mb-1 block font-medium text-gray-700">
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
                  <span className="mb-1 block font-medium text-gray-700">
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

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={resetImageAttrs}
                  className="h-8 rounded border border-gray-300 bg-white px-3 text-gray-700 hover:bg-gray-100"
                >
                  Reset
                </button>
              </div>
            </div>
          </>,
          document.body
        )}

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
