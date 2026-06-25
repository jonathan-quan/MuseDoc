import { describe, it, expect } from "vitest";
import { diffSegments, tokenizeForDiff } from "./diff";

// Reconstruct the "old" side (equal + deleted tokens) and the "new" side
// (equal + inserted tokens) from a segment list — both must round-trip.
const oldSide = (s: ReturnType<typeof diffSegments>) =>
  s.filter((seg) => seg.type !== "insert").map((seg) => seg.text).join("");
const newSide = (s: ReturnType<typeof diffSegments>) =>
  s.filter((seg) => seg.type !== "delete").map((seg) => seg.text).join("");

describe("tokenizeForDiff", () => {
  it("splits text into word and whitespace tokens", () => {
    expect(tokenizeForDiff("a big cat")).toEqual(["a", " ", "big", " ", "cat"]);
  });

  it("returns an empty array for an empty string", () => {
    expect(tokenizeForDiff("")).toEqual([]);
  });
});

describe("diffSegments", () => {
  it("marks identical text as a single equal segment", () => {
    expect(diffSegments("hello world", "hello world")).toEqual([
      { type: "equal", text: "hello world" },
    ]);
  });

  it("detects a pure insertion and round-trips both sides", () => {
    const segs = diffSegments("a c", "a b c");
    expect(segs.map((s) => s.type)).toContain("insert");
    expect(oldSide(segs)).toBe("a c");
    expect(newSide(segs)).toBe("a b c");
  });

  it("detects a pure deletion and round-trips both sides", () => {
    const segs = diffSegments("a b c", "a c");
    expect(segs.map((s) => s.type)).toContain("delete");
    expect(oldSide(segs)).toBe("a b c");
    expect(newSide(segs)).toBe("a c");
  });

  it("represents a replacement as a delete plus an insert", () => {
    const segs = diffSegments("the quick fox", "the slow fox");
    const types = segs.map((s) => s.type);
    expect(types).toContain("delete");
    expect(types).toContain("insert");
    expect(oldSide(segs)).toBe("the quick fox");
    expect(newSide(segs)).toBe("the slow fox");
  });

  it("merges adjacent same-type tokens into one segment", () => {
    expect(diffSegments("one two three", "")).toEqual([
      { type: "delete", text: "one two three" },
    ]);
  });

  it("handles insertion into an empty original", () => {
    expect(diffSegments("", "new text")).toEqual([
      { type: "insert", text: "new text" },
    ]);
  });
});
