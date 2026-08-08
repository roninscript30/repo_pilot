/**
 * Character-level ("word") diff for a single changed line pair.
 *
 * Produces a sequence of context / remove / add segments for one old line
 * and the new line that replaced it, so the diff viewer can highlight the
 * exact characters that changed. Lines beyond a size cap fall back to
 * whole-line segments to keep the LCS DP bounded.
 */

export type WordSegmentKind = "context" | "add" | "remove";

export interface WordSegment {
  readonly kind: WordSegmentKind;
  readonly text: string;
}

/** Beyond this many characters the LCS DP becomes too costly; degrade. */
const MAX_WORD_DIFF_CHARS = 400;

/** Character-level diff of one line pair. */
export function wordDiff(before: string, after: string): readonly WordSegment[] {
  if (before === after) {
    return before ? [{ kind: "context", text: before }] : [];
  }
  if (before.length > MAX_WORD_DIFF_CHARS || after.length > MAX_WORD_DIFF_CHARS) {
    const segments: WordSegment[] = [];
    if (before) segments.push({ kind: "remove", text: before });
    if (after) segments.push({ kind: "add", text: after });
    return segments;
  }
  return groupSegments(charOps(before, after));
}

/** LCS backtracking producing char-level ops in forward order. */
function charOps(a: string, b: string): Array<{ kind: WordSegmentKind; char: string }> {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i += 1) {
    const row = dp[i]!;
    const prevRow = dp[i - 1]!;
    const aChar = a[i - 1]!;
    for (let j = 1; j <= m; j += 1) {
      row[j] =
        aChar === b[j - 1] ? prevRow[j - 1]! + 1 : Math.max(prevRow[j]!, row[j - 1]!);
    }
  }

  const ops: Array<{ kind: WordSegmentKind; char: string }> = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    const aChar = a[i - 1]!;
    const bChar = b[j - 1]!;
    if (aChar === bChar) {
      ops.push({ kind: "context", char: aChar });
      i -= 1;
      j -= 1;
    } else if (dp[i - 1]![j]! > dp[i]![j - 1]!) {
      // Prefer UP (remove from a) when strictly greater
      ops.push({ kind: "remove", char: aChar });
      i -= 1;
    } else {
      // Prefer LEFT (add from b) when greater or equal
      ops.push({ kind: "add", char: bChar });
      j -= 1;
    }
  }
  while (i > 0) {
    ops.push({ kind: "remove", char: a[i - 1]! });
    i -= 1;
  }
  while (j > 0) {
    ops.push({ kind: "add", char: b[j - 1]! });
    j -= 1;
  }
  return ops.reverse();
}

/** Coalesce a char-op stream into contiguous segments. */
function groupSegments(
  ops: ReadonlyArray<{ kind: WordSegmentKind; char: string }>,
): WordSegment[] {
  const segments: WordSegment[] = [];
  for (const op of ops) {
    const last = segments[segments.length - 1];
    if (last && last.kind === op.kind) {
      segments[segments.length - 1] = { ...last, text: last.text + op.char };
    } else {
      segments.push({ kind: op.kind, text: op.char });
    }
  }
  return segments;
}
