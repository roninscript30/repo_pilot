/** Directory tree entry (recursive git tree). */
export interface TreeEntry {
  readonly path: string;
  readonly type: "blob" | "tree" | "commit";
  readonly size: number | null;
  readonly sha: string;
}

/** A single file or directory in a repository. */
export interface ContentItem {
  readonly type: "file" | "dir" | "submodule";
  readonly name: string;
  readonly path: string;
  readonly size: number;
  readonly content: string | null;
  readonly downloadUrl: string | null;
}

/** File-level change inside a commit or pull request. */
export interface FileChangeDetail {
  readonly filename: string;
  readonly status: "added" | "modified" | "removed" | "renamed";
  readonly additions: number;
  readonly deletions: number;
  readonly changes: number;
  /** Unified diff patch when the provider returns one. */
  readonly patch: string | null;
}

/** Weekly commit totals (stats/commit_activity). */
export interface CommitActivityWeek {
  readonly week: number;
  readonly total: number;
  readonly days: readonly number[];
}
