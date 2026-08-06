import type { CommitSummary } from "@/domain/models/commit";

export interface LaneInfo {
  /** First row index (0 = newest) that occupies this lane. */
  readonly firstRow: number;
  /** Last row index that occupies this lane. */
  readonly lastRow: number;
}

export interface GraphRow {
  readonly commit: CommitSummary;
  readonly lane: number;
  /** Lanes that terminate at this commit's row (merge connectors). */
  readonly mergeLanes: readonly number[];
}

interface LaneHead {
  readonly sha: string;
  readonly parents: readonly string[];
}

/**
 * Assigns graph lanes to an ordered commit list (newest first).
 *
 * A commit continues a lane when it is the first parent of that lane's
 * head (mainline) or any parent of it (side). Lanes whose head lists the
 * commit as a parent terminate at the commit's row.
 */
export function assignLanes(commits: readonly CommitSummary[]): readonly GraphRow[] {
  const heads: (LaneHead | null)[] = [];
  const rows: GraphRow[] = [];

  for (const commit of commits) {
    const mainline = heads.findIndex((head) => head !== null && head.parents[0] === commit.sha);
    const side = mainline === -1
      ? heads.findIndex((head) => head !== null && head.parents.includes(commit.sha))
      : -1;
    let lane = mainline !== -1 ? mainline : side;
    if (lane === -1) {
      lane = heads.length;
      heads.push(null);
    }

    const mergeLanes: number[] = [];
    heads.forEach((head, index) => {
      if (head !== null && head.sha !== commit.sha && head.parents.includes(commit.sha)) {
        if (index !== lane) {
          mergeLanes.push(index);
          heads[index] = null;
        }
      }
    });

    heads[lane] = { sha: commit.sha, parents: commit.parents };
    while (heads.length > 1 && heads[heads.length - 1] === null) heads.pop();
    rows.push({ commit, lane, mergeLanes });
  }

  return rows;
}

export function laneInfo(rows: readonly GraphRow[]): readonly LaneInfo[] {
  const info: LaneInfo[] = [];
  rows.forEach((row, index) => {
    const existing = info[row.lane];
    if (existing) {
      info[row.lane] = { firstRow: existing.firstRow, lastRow: index };
    } else {
      info[row.lane] = { firstRow: index, lastRow: index };
    }
  });
  return info;
}
