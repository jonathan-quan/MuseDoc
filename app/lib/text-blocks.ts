// Convert plain text (with lightweight `#`/`##`/`###` heading markers) into the
// editor's content JSON — paragraphs and h1–h3 nodes. Pure, so it is
// unit-testable; used when the assistant inserts generated text.

export type InlineContent =
  | { type: "text"; text: string }
  | { type: "hardBreak" };

export type TextBlockContent =
  | {
      type: "paragraph";
      content?: InlineContent[];
    }
  | {
      type: "heading";
      attrs: { level: 1 | 2 | 3 };
      content?: InlineContent[];
    };

export function linesToInlineContent(lines: string[]) {
  const content = lines.flatMap((line, index) => {
    const nodes: InlineContent[] = [];
    if (index > 0) nodes.push({ type: "hardBreak" });
    if (line) nodes.push({ type: "text", text: line });
    return nodes;
  });

  return content.length > 0 ? content : undefined;
}

export function textToEditorContent(text: string) {
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
