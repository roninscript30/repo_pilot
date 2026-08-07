import { describe, expect, it } from "vitest";
import { computeLineDiff, diffStats, parseDiffPath, parseUnifiedDiff, splitPatchByFile } from "./diff";

const SAMPLE_PATCH = [
  "@@ -1,4 +1,5 @@",
  " import { Card } from \"@/components/ui/Card\";",
  "-const oldValue = 1;",
  "+const newValue = 2;",
  "+const another = 3;",
  " export function example() {",
  "@@ -20,2 +22,3 @@",
  "-removed",
  "+added",
  " context",
].join("\n");

describe("parseUnifiedDiff", () => {
  it("parses hunks with metadata", () => {
    const hunks = parseUnifiedDiff(SAMPLE_PATCH);
    expect(hunks).toHaveLength(2);
    expect(hunks[0]).toMatchObject({ oldStart: 1, oldLines: 4, newStart: 1, newLines: 5 });
    expect(hunks[1]).toMatchObject({ oldStart: 20, oldLines: 2, newStart: 22, newLines: 3 });
  });

  it("classifies lines and numbers them per side", () => {
    const hunks = parseUnifiedDiff(SAMPLE_PATCH);
    const lines = hunks[0]?.lines ?? [];
    expect(lines[0]).toMatchObject({ type: "context", oldLine: 1, newLine: 1 });
    expect(lines[1]).toMatchObject({ type: "remove", oldLine: 2, newLine: null });
    expect(lines[2]).toMatchObject({ type: "add", oldLine: null, newLine: 2 });
    expect(lines[3]).toMatchObject({ type: "add", oldLine: null, newLine: 3 });
    expect(lines[4]).toMatchObject({ type: "context", oldLine: 3, newLine: 4 });
  });

  it("ignores diff headers and returns no hunks for empty patches", () => {
    expect(parseUnifiedDiff("--- a/x\n+++ b/x\n@@ -1,1 +1,1 @@\n same\n")).toHaveLength(1);
    expect(parseUnifiedDiff("")).toEqual([]);
    expect(parseUnifiedDiff("no hunks here")).toEqual([]);
  });

  it("computes stats", () => {
    expect(diffStats(parseUnifiedDiff(SAMPLE_PATCH))).toEqual({ additions: 3, deletions: 2 });
  });
});

describe("computeLineDiff", () => {
  it("returns no hunks for identical input", () => {
    const hunks = computeLineDiff("a\nb\nc\n", "a\nb\nc\n");
    expect(hunks).toEqual([]);
  });

  it("detects additions and removals with correct numbers", () => {
    const hunks = computeLineDiff("a\nb\n", "a\nx\nb\n");
    const lines = hunks.flatMap((hunk) => hunk.lines);
    expect(lines.find((line) => line.text === "x")).toMatchObject({ type: "add", oldLine: null, newLine: 2 });
  });

  it("handles fully new and fully removed files", () => {
    const added = computeLineDiff("", "x\ny\n");
    expect(added.flatMap((hunk) => hunk.lines).every((line) => line.type === "add")).toBe(true);
    const removed = computeLineDiff("x\ny\n", "");
    expect(removed.flatMap((hunk) => hunk.lines).every((line) => line.type === "remove")).toBe(true);
  });

  it("returns no hunks when both sides are empty", () => {
    expect(computeLineDiff("", "")).toEqual([]);
  });

  it("falls back to full replacement for very large files", () => {
    const big = `${"line\n".repeat(500)}`;
    const oldCount = big.split("\n").length;
    const hunks = computeLineDiff(big, `${big}extra\n`);
    const stats = diffStats(hunks);
    expect(stats.deletions).toBe(oldCount);
    expect(stats.additions).toBe(oldCount + 1);
  });
});

describe("splitPatchByFile", () => {
  const PATCH = [
    "diff --git a/src/a.ts b/src/a.ts",
    "index 1111111..2222222 100644",
    "--- a/src/a.ts",
    "+++ b/src/a.ts",
    "@@ -1,2 +1,2 @@",
    "-old",
    "+new",
    "diff --git a/src/b.ts b/src/b.ts",
    "new file mode 100644",
    "--- /dev/null",
    "+++ b/src/b.ts",
    "@@ -0,0 +1 @@",
    "+fresh",
  ].join("\n");

  it("splits a combined patch into per-file patches", () => {
    const files = splitPatchByFile(PATCH);
    expect(files).toHaveLength(2);
    expect(files[0]).toMatchObject({ filename: "src/a.ts", status: "modified", additions: 1, deletions: 1 });
    expect(files[1]).toMatchObject({ filename: "src/b.ts", status: "added", additions: 1, deletions: 0 });
  });

  it("skips renames without a diff body", () => {
    const rename = "diff --git a/old.ts b/new.ts\nsimilarity index 100%\nrename from old.ts\nrename to new.ts\n";
    expect(splitPatchByFile(rename)).toEqual([]);
  });

  it("returns an empty list for empty input", () => {
    expect(splitPatchByFile("")).toEqual([]);
  });
});

describe("parseDiffPath", () => {
  it("extracts the b-side path", () => {
    expect(parseDiffPath("a/src/x.ts b/src/x.ts")).toBe("src/x.ts");
    expect(parseDiffPath("a/.env b/.env")).toBe(".env");
    expect(parseDiffPath("not a diff header")).toBeNull();
  });
});
