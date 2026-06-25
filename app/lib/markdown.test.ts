import { describe, it, expect } from "vitest";
import { editorMarkdown, type PMNode } from "./markdown";

const doc = (content: PMNode[]): PMNode => ({ type: "doc", content });

describe("editorMarkdown", () => {
  it("renders a heading with the right number of hashes", () => {
    const md = editorMarkdown(
      doc([
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Title" }],
        },
      ])
    );
    expect(md).toBe("## Title\n");
  });

  it("applies inline marks (bold, italic, code, link)", () => {
    const md = editorMarkdown(
      doc([
        {
          type: "paragraph",
          content: [
            { type: "text", text: "b", marks: [{ type: "bold" }] },
            { type: "text", text: " " },
            { type: "text", text: "i", marks: [{ type: "italic" }] },
            { type: "text", text: " " },
            { type: "text", text: "c", marks: [{ type: "code" }] },
            { type: "text", text: " " },
            {
              type: "text",
              text: "link",
              marks: [{ type: "link", attrs: { href: "https://x.dev" } }],
            },
          ],
        },
      ])
    );
    expect(md).toBe("**b** *i* `c` [link](https://x.dev)\n");
  });

  it("renders bullet-list items", () => {
    const md = editorMarkdown(
      doc([
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "one" }] },
              ],
            },
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "two" }] },
              ],
            },
          ],
        },
      ])
    );
    expect(md).toContain("- one");
    expect(md).toContain("- two");
  });

  it("renders a table with a header separator row", () => {
    const cell = (t: string): PMNode => ({
      type: "tableCell",
      content: [{ type: "paragraph", content: [{ type: "text", text: t }] }],
    });
    const row = (...cells: string[]): PMNode => ({
      type: "tableRow",
      content: cells.map(cell),
    });
    const md = editorMarkdown(
      doc([{ type: "table", content: [row("A", "B"), row("1", "2")] }])
    );
    expect(md).toContain("| A | B |");
    expect(md).toContain("| --- | --- |");
    expect(md).toContain("| 1 | 2 |");
  });

  it("renders a horizontal rule", () => {
    const md = editorMarkdown(
      doc([
        { type: "horizontalRule" },
        { type: "paragraph", content: [{ type: "text", text: "after" }] },
      ])
    );
    expect(md).toBe("---\n\nafter\n");
  });

  it("renders an image", () => {
    const md = editorMarkdown(
      doc([{ type: "image", attrs: { src: "/cat.png" } }])
    );
    expect(md).toBe("![](/cat.png)\n");
  });
});
