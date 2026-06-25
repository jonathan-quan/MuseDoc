// Word-level text diff powering the editor's inline edit-review (the green/red
// accept-reject marks). Pure string logic with no editor/ProseMirror
// dependency, so it is unit-testable in isolation.

export type DiffSegment = { type: "equal" | "delete" | "insert"; text: string };

export function tokenizeForDiff(text: string): string[] {
  return text.match(/\s+|[^\s]+/g) ?? [];
}

/** Word-level diff of two strings, with adjacent same-type tokens merged. */
export function diffSegments(original: string, next: string): DiffSegment[] {
  const a = tokenizeForDiff(original);
  const b = tokenizeForDiff(next);
  const dp = Array.from({ length: a.length + 1 }, () =>
    Array<number>(b.length + 1).fill(0)
  );
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      dp[i][j] =
        a[i] === b[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const parts: DiffSegment[] = [];
  const push = (type: DiffSegment["type"], text: string) => {
    const last = parts[parts.length - 1];
    if (last && last.type === type) last.text += text;
    else parts.push({ type, text });
  };
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push("equal", a[i]);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push("delete", a[i]);
      i += 1;
    } else {
      push("insert", b[j]);
      j += 1;
    }
  }
  while (i < a.length) push("delete", a[i++]);
  while (j < b.length) push("insert", b[j++]);
  return parts;
}
