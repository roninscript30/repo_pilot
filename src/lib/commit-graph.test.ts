import { describe, expect, it } from "vitest";
import { assignLanes, laneInfo } from "./commit-graph";
import type { CommitSummary } from "@/domain/models/commit";

function commit(sha: string, parents: readonly string[]): CommitSummary {
  return {
    sha,
    shortSha: sha.slice(0, 7),
    message: sha,
    subject: sha,
    author: { name: "t", email: "t@t", login: null, avatarUrl: null },
    committedAt: "",
    parents,
  };
}

describe("assignLanes", () => {
  it("keeps a linear history on one lane", () => {
    const commits = [commit("c3", ["c2"]), commit("c2", ["c1"]), commit("c1", [])];
    const rows = assignLanes(commits);
    expect(rows.map((row) => row.lane)).toEqual([0, 0, 0]);
    expect(rows.every((row) => row.mergeLanes.length === 0)).toBe(true);
  });

  it("splits lanes at branch points and merges them back", () => {
    // m (merge, parents b+a) <- b; s (side branch); both b and s end at a (root)
    const commits = [
      commit("m", ["b", "a"]),
      commit("b", ["a"]),
      commit("s", ["a"]),
      commit("a", []),
    ];
    const rows = assignLanes(commits);
    expect(rows.map((row) => row.lane)).toEqual([0, 0, 1, 0]);
    expect(rows[3]?.mergeLanes).toEqual([1]);
  });

  it("reuses a lane when a commit continues a parent", () => {
    const commits = [
      commit("c3", ["c2"]),
      commit("c2", ["c1"]),
      commit("c1", []),
      commit("side", ["c1"]),
    ];
    const rows = assignLanes(commits);
    const lanes = rows.map((row) => row.lane);
    expect(lanes[0]).toBe(0);
    expect(lanes[1]).toBe(0);
    expect(lanes[2]).toBe(0);
    expect(lanes[3]).toBe(1);
  });
});

describe("laneInfo", () => {
  it("tracks first and last row per lane", () => {
    const commits = [
      commit("m", ["b", "a"]),
      commit("b", ["a"]),
      commit("s", ["a"]),
      commit("a", []),
    ];
    const rows = assignLanes(commits);
    const info = laneInfo(rows);
    expect(info).toHaveLength(2);
    expect(info[0]).toEqual({ firstRow: 0, lastRow: 3 });
    expect(info[1]).toEqual({ firstRow: 2, lastRow: 2 });
  });
});
