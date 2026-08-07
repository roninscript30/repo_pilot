/**
 * Lightweight subsequence fuzzy matcher for the command palette and
 * global search. Returns a score (higher is better) or null when the
 * query does not match the target.
 */
export function fuzzyScore(query: string, target: string): number | null {
  const q = query.trim().toLowerCase();
  const t = target.toLowerCase();
  if (q.length === 0) return 0;
  if (t.length === 0) return null;

  let score = 0;
  let queryIndex = 0;
  let previousMatch = -2;

  for (let targetIndex = 0; targetIndex < t.length && queryIndex < q.length; targetIndex += 1) {
    const targetChar = t[targetIndex];
    if (targetChar !== q[queryIndex]) continue;

    // Consecutive characters score higher; word starts score extra.
    if (targetIndex === previousMatch + 1) {
      score += 2;
    } else if (targetIndex > 0 && t[targetIndex - 1] === " ") {
      score += 2;
    } else if (targetIndex === 0) {
      score += 1.5;
    } else {
      score += 1;
    }
    previousMatch = targetIndex;
    queryIndex += 1;
  }

  if (queryIndex < q.length) return null;
  // Prefer shorter targets and early matches.
  score += Math.max(0, 8 - t.length) * 0.25;
  return score;
}

/** Sort candidates by fuzzy score, descending. */
export function fuzzySort<T>(query: string, items: readonly T[], extract: (item: T) => string): T[] {
  const scored: { item: T; score: number }[] = [];
  for (const item of items) {
    const score = fuzzyScore(query, extract(item));
    if (score !== null) {
      scored.push({ item, score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map((entry) => entry.item);
}
