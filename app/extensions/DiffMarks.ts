import { Mark, mergeAttributes } from "@tiptap/core";

// Two marks used to preview an assistant edit inline in the document: inserted
// text (green) and deleted text (red strikethrough). They are applied while a
// suggestion is under review and removed/finalized on accept or reject, so they
// never need to be persisted. Styling lives in globals.css (.diff-insert /
// .diff-delete).

export const DiffInsert = Mark.create({
  name: "diffInsert",
  inclusive: false,
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
