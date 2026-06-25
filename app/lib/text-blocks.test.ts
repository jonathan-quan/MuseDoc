import { describe, it, expect } from "vitest";
import { textToEditorContent } from "./text-blocks";

describe("textToEditorContent", () => {
  it("wraps a single line in a paragraph", () => {
    expect(textToEditorContent("hello")).toEqual([
      { type: "paragraph", content: [{ type: "text", text: "hello" }] },
    ]);
  });

  it("parses #, ##, ### into h1–h3 headings", () => {
    expect(textToEditorContent("# Big\n## Medium\n### Small")).toEqual([
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Big" }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Medium" }] },
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Small" }] },
    ]);
  });

  it("splits blank-line-separated paragraphs", () => {
    const blocks = textToEditorContent("first\n\nsecond");
    expect(blocks).toHaveLength(2);
    expect(blocks.every((b) => b.type === "paragraph")).toBe(true);
  });

  it("keeps a multi-line paragraph together with a hard break", () => {
    const [block] = textToEditorContent("line one\nline two");
    expect(block).toEqual({
      type: "paragraph",
      content: [
        { type: "text", text: "line one" },
        { type: "hardBreak" },
        { type: "text", text: "line two" },
      ],
    });
  });

  it("produces no blocks for blank input", () => {
    expect(textToEditorContent("   \n  ")).toEqual([]);
  });
});
