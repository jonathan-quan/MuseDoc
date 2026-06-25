import { describe, it, expect } from "vitest";
import { formatBytes, formatTimestamp } from "./format";

describe("formatBytes", () => {
  it("formats raw bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
  });
  it("crosses into KB at 1024", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
  });
  it("formats kilobytes with one decimal", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
  });
  it("formats megabytes", () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("formatTimestamp", () => {
  it("shows a clock time for earlier today", () => {
    const now = new Date();
    const earlier = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      9,
      5
    ).getTime();
    // A time-of-day label contains digits (exact format is locale-dependent).
    expect(formatTimestamp(earlier)).toMatch(/\d/);
  });

  it('labels the previous day as "Yesterday"', () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    expect(formatTimestamp(d.getTime())).toBe("Yesterday");
  });

  it("includes the year for a date in a previous year", () => {
    const lastYear = new Date(new Date().getFullYear() - 1, 0, 15).getTime();
    expect(formatTimestamp(lastYear)).toMatch(/\b\d{4}\b/);
  });
});
