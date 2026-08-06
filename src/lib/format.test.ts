import { describe, expect, it, vi, beforeEach } from "vitest";
import { compactNumber, formatDate, timeAgo } from "./format";

describe("timeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-06T12:00:00Z"));
  });

  it("returns a placeholder for empty or invalid input", () => {
    expect(timeAgo("")).toBe("—");
    expect(timeAgo("not-a-date")).toBe("—");
  });

  it("formats recent timestamps as 'just now'", () => {
    expect(timeAgo("2026-08-06T11:59:40Z")).toBe("just now");
  });

  it("formats minutes, hours, days and months", () => {
    expect(timeAgo("2026-08-06T11:59:00Z")).toBe("1m ago");
    expect(timeAgo("2026-08-06T11:30:00Z")).toBe("30m ago");
    expect(timeAgo("2026-08-06T10:30:00Z")).toBe("2h ago");
    expect(timeAgo("2026-08-01T12:00:00Z")).toBe("5d ago");
    expect(timeAgo("2026-05-06T12:00:00Z")).toBe("3mo ago");
  });

  it("formats years", () => {
    expect(timeAgo("2023-08-06T12:00:00Z")).toBe("3y ago");
  });

  it("clamps future timestamps to 'just now'", () => {
    expect(timeAgo("2026-08-06T12:05:00Z")).toBe("just now");
  });
});

describe("compactNumber", () => {
  it("formats plain numbers", () => {
    expect(compactNumber(42)).toBe("42");
    expect(compactNumber(999)).toBe("999");
  });

  it("formats thousands with one decimal", () => {
    expect(compactNumber(1200)).toBe("1.2K");
    expect(compactNumber(10000)).toBe("10K");
    expect(compactNumber(1520000)).toBe("1.5M");
  });
});

describe("formatDate", () => {
  it("returns a placeholder for empty or invalid input", () => {
    expect(formatDate("")).toBe("—");
    expect(formatDate("nope")).toBe("—");
  });

  it("formats a valid ISO date", () => {
    expect(formatDate("2026-08-06T12:00:00Z")).toBe("Aug 6, 2026");
  });
});
