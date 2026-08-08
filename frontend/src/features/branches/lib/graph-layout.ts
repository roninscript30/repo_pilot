import type { GraphNode } from "@/domain/models/git";

/** One row of the branch graph canvas: commit + lane spans. */
export interface GraphLayoutRow {
  readonly node: GraphNode;
  /** Primary lane this commit occupies. */
  readonly lane: number;
  /** Lanes that terminate at this commit (merge connectors). */
  readonly mergeLanes: readonly number[];
  /** Vertical lane spans across all rows. */
  readonly laneRows: readonly LaneSpan[];
}

export interface LaneSpan {
  readonly lane: number;
  readonly firstRow: number;
  readonly lastRow: number;
}

interface LaneHead {
  readonly id: string;
  readonly parents: readonly string[];
}

/**
 * Assigns canvas lanes to the commit DAG (newest first, as returned by
 * the backend). A commit continues a lane when it is the first parent of
 * that lane's head (mainline), or any parent of it (side). Lanes whose
 * head lists the commit as a parent terminate at the commit's row.
 */
export function layoutGraph(nodes: readonly GraphNode[]): readonly GraphLayoutRow[] {
  interface MutableRow {
    node: GraphNode;
    lane: number;
    mergeLanes: number[];
    laneRows: LaneSpan[];
  }
  const heads: (LaneHead | null)[] = [];
  const rows: MutableRow[] = [];

  for (const node of nodes) {
    const mainline = heads.findIndex(
      (head) => head !== null && head.parents[0] === node.id,
    );
    const side =
      mainline === -1
        ? heads.findIndex((head) => head !== null && head.parents.includes(node.id))
        : -1;
    let lane = mainline !== -1 ? mainline : side;
    if (lane === -1) {
      lane = heads.length;
      heads.push(null);
    }

    const mergeLanes: number[] = [];
    heads.forEach((head, index) => {
      if (head !== null && head.id !== node.id && head.parents.includes(node.id)) {
        if (index !== lane) {
          mergeLanes.push(index);
          heads[index] = null;
        }
      }
    });

    heads[lane] = { id: node.id, parents: node.parents };
    while (heads.length > 1 && heads[heads.length - 1] === null) heads.pop();
    rows.push({ node, lane, mergeLanes, laneRows: [] });
  }

  interface MutableSpan {
    lane: number;
    firstRow: number;
    lastRow: number;
  }
  const spans: MutableSpan[] = [];
  rows.forEach((row, index) => {
    const existing = spans.find((span) => span.lane === row.lane);
    if (existing) existing.lastRow = index;
    else spans.push({ lane: row.lane, firstRow: index, lastRow: index });
  });
  const frozen: LaneSpan[] = spans.map((span) => ({ ...span }));
  for (const row of rows) {
    row.laneRows = frozen;
  }
  return rows;
}
