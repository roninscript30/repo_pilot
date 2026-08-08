import { describe, expect, it } from "vitest";
import { layoutGraph } from "./graph-layout";
import type { GraphNode } from "@/domain/models/git";

function node(id: string, parents: string[] = []): GraphNode {
  return {
    id,
    parents,
    refs: [],
    subject: `subject ${id}`,
    authorName: "A",
    authorEmail: "a@example.com",
    time: 0,
    isMerge: false,
  };
}

describe("layoutGraph", () => {
  it("assigns a single lane for a linear history", () => {
    const rows = layoutGraph([node("c3", ["c2"]), node("c2", ["c1"]), node("c1")]);
    expect(rows.map((row) => row.lane)).toEqual([0, 0, 0]);
    expect(rows.every((row) => row.mergeLanes.length === 0)).toBe(true);
  });

  it("opens a second lane for a side branch and merges it back", () => {
    const rows = layoutGraph([
      node("c4", ["c3", "c2"]),
      node("c3", ["c1"]),
      node("c2", ["c1"]),
      node("c1"),
    ]);
    expect(rows[0]!.lane).toBe(0);
    expect(rows[0]!.mergeLanes).toEqual([]);
    expect(rows[1]!.lane).toBe(0);
    expect(rows[2]!.lane).toBe(1);
    // c1 is the merge base: the side lane terminates there
    expect(rows[3]!.lane).toBe(0);
    expect(rows[3]!.mergeLanes).toEqual([1]);
  });

  it("carries lane spans across every row", () => {
    const rows = layoutGraph([node("c4", ["c3", "c2"]), node("c3", ["c1"]), node("c2", ["c1"]), node("c1")]);
    const span = rows[0]!.laneRows[0]!;
    expect(span.firstRow).toBe(0);
    expect(span.lastRow).toBe(3);
  });

  it("handles the empty graph", () => {
    expect(layoutGraph([])).toEqual([]);
  });
});
