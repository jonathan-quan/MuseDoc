// Serialize the editor's ProseMirror JSON document to Markdown. Operates on
// plain JSON nodes (PMNode), so it has no TipTap runtime dependency and is
// unit-testable.

export type PMNode = {
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

export function editorMarkdown(doc: PMNode): string {
  return `${blocksToMarkdown(doc.content).trim()}\n`;
}
