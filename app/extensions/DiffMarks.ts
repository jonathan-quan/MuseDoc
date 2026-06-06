import { Mark, mergeAttributes } from "@tiptap/core";

// Two marks used to preview an assistant edit inline in the document: inserted
// text (green) and deleted text (red strikethrough). They are applied while a
// suggestion is under review and removed/finalized on accept or reject, so they
// never need to be persisted. Styling lives in globals.css (.diff-insert /
// .diff-delete).
//
// Each mark carries a `hunk` id grouping the text that belongs to one logical
// change (a deletion and its replacement insertion share an id). That lets the
// reviewer hover a single change and keep or discard just that part, leaving the
// other changes pending — rendered as a `data-hunk` attribute so the hover UI
// can find every span of a hunk in the DOM.

const hunkAttribute = {
  hunk: {
    default: null as number | null,
    parseHTML: (element: HTMLElement) => {
      const value = element.getAttribute("data-hunk");
      return value == null ? null : Number(value);
    },
    renderHTML: (attributes: { hunk?: number | null }) =>
      attributes.hunk == null ? {} : { "data-hunk": String(attributes.hunk) },
  },
};

export const DiffInsert = Mark.create({
  name: "diffInsert",
  inclusive: false,
  addAttributes() {
    return hunkAttribute;
  },
  parseHTML() {
    return [{ tag: "ins[data-diff]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "ins",
      mergeAttributes(HTMLAttributes, { "data-diff": "insert", class: "diff-insert" }),
      0,
    ];
  },
});

export const DiffDelete = Mark.create({
  name: "diffDelete",
  inclusive: false,
  addAttributes() {
    return hunkAttribute;
  },
  parseHTML() {
    return [{ tag: "del[data-diff]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "del",
      mergeAttributes(HTMLAttributes, { "data-diff": "delete", class: "diff-delete" }),
      0,
    ];
  },
});
