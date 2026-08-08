import { describe, expect, it } from "vitest";
import { wordDiff } from "@/lib/word-diff";

describe("wordDiff", () => {
  it("returns a single context segment for identical lines", () => {
    expect(wordDiff("same line", "same line")).toEqual([{ kind: "context", text: "same line" }]);
  });

  it("returns empty for two empty strings", () => {
    expect(wordDiff("", "")).toEqual([]);
  });

  it("spans a pure insertion with context around it", () => {
    const segments = wordDiff("a b", "a x b");
    expect(segments.some((segment) => segment.kind === "add")).toBe(true);
    expect(segments[0]?.kind).toBe("context");
    expect(segments[segments.length - 1]?.kind).toBe("context");
  });

  it("marks a pure insertion as add (no remove when old is subsequence)", () => {
    const segments = wordDiff("color", "colour");
    const kinds = segments.filter((segment) => segment.kind !== "context");
    expect(kinds.some((segment) => segment.kind === "add")).toBe(true);
    expect(kinds.some((segment) => segment.kind === "remove")).toBe(false);
  });

  it("treats a fully new line as a pure add", () => {
    const segments = wordDiff("", "brand new");
    expect(segments).toEqual([{ kind: "add", text: "brand new" }]);
  });

  it("treats a fully removed line as a pure remove", () => {
    const segments = wordDiff("gone", "");
    expect(segments).toEqual([{ kind: "remove", text: "gone" }]);
  });

  it("degrades to whole-line segments for oversized inputs", () => {
    const long = "x".repeat(500);
    const segments = wordDiff(long, `${long}y`);
    expect(segments.length).toBe(2);
    expect(segments[0]).toEqual({ kind: "remove", text: long });
    expect(segments[1]?.kind).toBe("add");
  });

  it("produces segments in document order covering both old and new text", () => {
    const before = "alpha beta gamma delta";
    const after = "alpha beta epsilon delta";
    const segments = wordDiff(before, after);
    const kinds = segments.map((s) => s.kind);
    expect(kinds).toEqual(["context", "remove", "add", "context"]);
    expect(segments[1]?.text).toBe("gamma");
    expect(segments[2]?.text).toBe("epsilon");
  });
});
