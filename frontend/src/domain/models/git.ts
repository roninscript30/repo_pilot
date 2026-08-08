import type { CommitSummary } from "./commit";

/** Where a working tree file sits relative to the index and HEAD. */
export type WorktreeFileState =
  | "staged"
  | "unstaged"
  | "untracked"
  | "ignored"
  | "conflicted";

/** One changed file in the working tree with per-area line counts. */
export interface WorktreeFile {
  readonly path: string;
  readonly state: WorktreeFileState;
  readonly stagedAdditions: number;
  readonly stagedDeletions: number;
  readonly unstagedAdditions: number;
  readonly unstagedDeletions: number;
}

export type DiffLineKind = "context" | "add" | "remove";

/** One changed or context line within a diff hunk. */
export interface DiffLine {
  readonly kind: DiffLineKind;
  /** Line number in the old file (null for added lines). */
  readonly oldNo: number | null;
  /** Line number in the new file (null for removed lines). */
  readonly newNo: number | null;
  readonly text: string;
}

/** A contiguous change window with context lines and its start numbers. */
export interface DiffHunk {
  readonly oldStart: number;
  readonly oldLines: number;
  readonly newStart: number;
  readonly newLines: number;
  readonly lines: readonly DiffLine[];
}

/** A local tag pointing at a commit (peeled). */
export interface TagInfo {
  readonly name: string;
  readonly id: string;
}

/** A file-level diff with a unified patch and line counts. */
export interface FileDiff {
  readonly path: string;
  readonly status: "added" | "removed" | "modified" | "renamed";
  readonly additions: number;
  readonly deletions: number;
  /** Unified diff text; null for binary or oversized files. */
  readonly patch: string | null;
  readonly binary: boolean;
  /** Structured line hunks from the backend (single source of truth). */
  readonly hunks?: readonly DiffHunk[];
}

export interface RefComparisonFile {
  readonly path: string;
  readonly status: "added" | "removed" | "modified" | "renamed";
  readonly additions: number;
  readonly deletions: number;
}

/**
 * Result of comparing two refs: merge base, direction counts, the
 * commits reachable from target but not base, and the changed files.
 */
export interface RefComparison {
  readonly baseRef: string;
  readonly targetRef: string;
  readonly mergeBase: string | null;
  /** Commits on target not reachable from base. */
  readonly aheadBy: number;
  /** Commits on base not reachable from target. */
  readonly behindBy: number;
  readonly commits: readonly CommitSummary[];
  readonly files: readonly RefComparisonFile[];
  /** Paths changed on both sides: a merge would conflict on these. */
  readonly conflictPaths: readonly string[];
}

/** Outcome of simulating a merge of `headRef` into `targetRef`. */
export interface MergePreview {
  readonly headRef: string;
  readonly targetRef: string;
  readonly mergeBase: string | null;
  readonly fastForward: boolean;
  /** Commits in head not reachable from target. */
  readonly commitsAhead: number;
  readonly filesChanged: readonly RefComparisonFile[];
  /** Paths changed on both sides (predicted conflicts). */
  readonly conflictPaths: readonly string[];
  readonly canMerge: boolean;
}

/** Synchronization activity recorded for a repository path. */
export interface SyncLog {
  readonly fetchAt: string | null;
  readonly pullAt: string | null;
  readonly pushAt: string | null;
}
