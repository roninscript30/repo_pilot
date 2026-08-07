/**
 * Diff utilities: unified-diff parsing and line diffing.
 *
 * `parseUnifiedDiff` consumes the `patch` field returned by providers.
 * `computeLineDiff` produces the same shape for providers that only give
 * before/after content. Both feed the diff viewer components.
 */

export type DiffLineType = "context" | "add" | "remove";

export interface DiffLine {
  readonly type: DiffLineType;
  /** Line number in the old file (null for added lines). */
  readonly oldLine: number | null;
  /** Line number in the new file (null for removed lines). */
  readonly newLine: number | null;
  readonly text: string;
}

export interface DiffHunk {
  readonly oldStart: number;
  readonly oldLines: number;
  readonly newStart: number;
  readonly newLines: number;
  readonly lines: readonly DiffLine[];
}

/** Parses a unified diff (git format) into hunks. */
export function parseUnifiedDiff(patch: string): readonly DiffHunk[] {
  const hunks: DiffHunk[] = [];
  let lines: DiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;
  let oldStart = 0;
  let oldCount = 0;
  let newStart = 0;
  let newCount = 0;
  let sawHeader = false;

  const parts = patch.split("\n");
  // Drop the artifact produced by a trailing newline.
  if (parts[parts.length - 1] === "") parts.pop();

  for (const rawLine of parts) {
    const line = rawLine.replace(/\r$/, "");
    if (
      /^(---|\+\+\+) /.test(line) ||
      /^diff --git/.test(line) ||
      /^index [0-9a-f]{7,}/.test(line) ||
      /^(new|deleted) file mode/.test(line) ||
      /^(old|new) mode /.test(line) ||
      /^(similarity|dissimilarity) index/.test(line) ||
      /^rename (from|to) /.test(line) ||
      /^copy (from|to) /.test(line) ||
      line === "\\ No newline at end of file"
    ) {
      continue;
    }
    const hunkHeader = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (hunkHeader) {
      if (lines.length > 0) {
        hunks.push({ oldStart, oldLines: oldCount, newStart, newLines: newCount, lines });
      }
      lines = [];
      sawHeader = true;
      oldStart = Number(hunkHeader[1]);
      oldCount = hunkHeader[2] ? Number(hunkHeader[2]) : 1;
      newStart = Number(hunkHeader[3]);
      newCount = hunkHeader[4] ? Number(hunkHeader[4]) : 1;
      oldLine = oldStart;
      newLine = newStart;
      continue;
    }

    const marker = line.slice(0, 1);
    if (marker === "+") {
      lines.push({ type: "add", oldLine: null, newLine, text: line.slice(1) });
      newLine += 1;
    } else if (marker === "-") {
      lines.push({ type: "remove", oldLine, newLine: null, text: line.slice(1) });
      oldLine += 1;
    } else {
      lines.push({ type: "context", oldLine, newLine, text: marker === " " ? line.slice(1) : line });
      oldLine += 1;
      newLine += 1;
    }
  }
  if (lines.length > 0 && sawHeader) {
    hunks.push({ oldStart, oldLines: oldCount, newStart, newLines: newCount, lines });
  }
  return hunks;
}

const MAX_DIFF_MATRIX = 400;

/** Longest-common-subsequence line diff with a bounded matrix. */
export function computeLineDiff(oldText: string, newText: string): readonly DiffHunk[] {
  const oldLines = oldText.length > 0 ? oldText.split("\n") : [];
  const newLines = newText.length > 0 ? newText.split("\n") : [];

  if (oldLines.length === 0 && newLines.length === 0) return [];

  const bounded = oldLines.length <= MAX_DIFF_MATRIX && newLines.length <= MAX_DIFF_MATRIX;
  if (!bounded) {
    // Too large for the matrix: report the file as fully replaced.
    return [{
      oldStart: 1,
      oldLines: oldLines.length,
      newStart: 1,
      newLines: newLines.length,
      lines: [
        ...oldLines.map((text, index) => ({ type: "remove" as const, oldLine: index + 1, newLine: null, text })),
        ...newLines.map((text, index) => ({ type: "add" as const, oldLine: null, newLine: index + 1, text })),
      ],
    }];
  }

  const n = oldLines.length;
  const m = newLines.length;
  const dp: Uint32Array[] = new Array(n + 1);
  for (let i = 0; i <= n; i += 1) {
    dp[i] = new Uint32Array(m + 1);
  }
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i]![j] = oldLines[i] === newLines[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }

  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (oldLines[i] === newLines[j]) {
      lines.push({ type: "context", oldLine: i + 1, newLine: j + 1, text: oldLines[i] ?? "" });
      i += 1;
      j += 1;
    } else if ((dp[i + 1]![j] ?? 0) >= (dp[i]![j + 1] ?? 0)) {
      lines.push({ type: "remove", oldLine: i + 1, newLine: null, text: oldLines[i] ?? "" });
      i += 1;
    } else {
      lines.push({ type: "add", oldLine: null, newLine: j + 1, text: newLines[j] ?? "" });
      j += 1;
    }
  }
  while (i < n) {
    lines.push({ type: "remove", oldLine: i + 1, newLine: null, text: oldLines[i] ?? "" });
    i += 1;
  }
  while (j < m) {
    lines.push({ type: "add", oldLine: null, newLine: j + 1, text: newLines[j] ?? "" });
    j += 1;
  }

  if (lines.length === 0) return [];

  // Group the numbered line stream into hunks: each hunk holds a change
  // window with at most 3 leading/trailing context lines.
  const hunks: DiffHunk[] = [];
  const total = lines.length;
  let index = 0;

  while (index < total) {
    while (index < total && lines[index]?.type === "context") {
      index += 1;
    }
    if (index >= total) break;

    let end = index;
    let changes = 0;
    let contextRun = 0;
    while (end < total) {
      if (lines[end]?.type === "context") {
        contextRun += 1;
      } else {
        changes += 1;
        contextRun = 0;
      }
      end += 1;
      if (changes > 0 && contextRun > 3) break;
      if (end - index >= 200) break;
    }

    let group = lines.slice(index, end);
    index = end;

    // Trim trailing context to 3 lines (changes never span the gap).
    let lastChange = 0;
    for (let cursor = 0; cursor < group.length; cursor += 1) {
      if (group[cursor]?.type !== "context") lastChange = cursor + 1;
    }
    group = group.slice(0, Math.min(group.length, lastChange + 3));

    let oldStart: number | null = null;
    let newStart: number | null = null;
    for (let cursor = 0; cursor < group.length; cursor += 1) {
      const line = group[cursor];
      if (oldStart === null && line?.oldLine !== null && line?.oldLine !== undefined) {
        oldStart = line.oldLine - cursor;
      }
      if (newStart === null && line?.newLine !== null && line?.newLine !== undefined) {
        newStart = line.newLine - cursor;
      }
    }
    if (oldStart === null) oldStart = 1;
    if (newStart === null) newStart = 1;

    const added = group.filter((line) => line.type === "add").length;
    const removed = group.filter((line) => line.type === "remove").length;
    const contexts = group.length - added - removed;

    hunks.push({
      oldStart,
      oldLines: removed + contexts,
      newStart,
      newLines: added + contexts,
      lines: group,
    });
  }

  return hunks;
}

export interface DiffStats {
  readonly additions: number;
  readonly deletions: number;
}

export function diffStats(hunks: readonly DiffHunk[]): DiffStats {
  let additions = 0;
  let deletions = 0;
  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      if (line.type === "add") additions += 1;
      if (line.type === "remove") deletions += 1;
    }
  }
  return { additions, deletions };
}

export interface FilePatch {
  readonly filename: string;
  readonly status: "added" | "modified" | "removed" | "renamed";
  readonly additions: number;
  readonly deletions: number;
  readonly patch: string;
}

/** Splits a combined multi-file patch on `diff --git` boundaries. */
export function splitPatchByFile(patch: string): readonly FilePatch[] {
  const rawChunks = patch.split(/^diff --git /m);
  const results: FilePatch[] = [];
  for (const chunk of rawChunks) {
    if (chunk.trim() === "") continue;
    const header = chunk.split("\n", 1)[0] ?? "";
    const filename = parseDiffPath(header);
    if (!filename) continue;
    const body = chunk.slice(header.length).replace(/^\n/, "");
    const hunks = parseUnifiedDiff(body);
    const stats = diffStats(hunks);
    let status: FilePatch["status"] = "modified";
    if (hunks.length === 0) {
      if (/^rename from /.test(body) || /^rename to /.test(body)) status = "renamed";
      continue;
    }
    const hasAdd = hunks.some((hunk) => hunk.lines.some((line) => line.type === "add"));
    const hasRemove = hunks.some((hunk) => hunk.lines.some((line) => line.type === "remove"));
    if (hasAdd && !hasRemove) status = "added";
    else if (hasRemove && !hasAdd) status = "removed";
    results.push({ filename, status, additions: stats.additions, deletions: stats.deletions, patch: `diff --git ${chunk}` });
  }
  return results;
}

/** Extracts the new-file path from a `diff --git a/.. b/..` header. */
export function parseDiffPath(header: string): string | null {
  const match = /^a\/.* b\/(.*)$/.exec(header);
  return match?.[1] ?? null;
}
