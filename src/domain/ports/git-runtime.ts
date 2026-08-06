import type { Branch } from "../models/branch";
import type { CommitDetail, CommitSummary } from "../models/commit";

/** Where the Git operation can actually run. */
export type GitRuntimeKind = "tauri" | "web-fallback";

/** A defined set of Git operations the platform exposes visually. */
export type GitOperation =
  | "commit"
  | "push"
  | "pull"
  | "fetch"
  | "stage"
  | "unstage"
  | "restore"
  | "checkout"
  | "create-branch"
  | "delete-branch"
  | "rename-branch"
  | "cherry-pick"
  | "revert"
  | "reset"
  | "tag"
  | "stash"
  | "compare-branches";

/** Local repository snapshot used by the UI. */
export interface WorktreeStatus {
  readonly repoPath: string;
  readonly currentBranch: string | null;
  readonly staged: readonly string[];
  readonly unstaged: readonly string[];
  readonly untracked: readonly string[];
  readonly aheadBy: number;
  readonly behindBy: number;
}

export interface GitOperationResult {
  readonly ok: boolean;
  /** Human-readable, safe to display. */
  readonly message: string;
  /** Present when the runtime cannot execute the operation. */
  readonly unsupported?: boolean;
}

/**
 * Seam for all local Git operations.
 *
 * Tauri shell: implemented with gitoxide behind invoke() calls.
 * Browser preview: transparent fallback that reports the operation
 * requires the desktop runtime instead of pretending to succeed.
 *
 * Nothing in the UI ever calls Git directly; everything goes through
 * this port.
 */
export interface GitRuntime {
  readonly kind: GitRuntimeKind;

  openRepository(path: string): Promise<WorktreeStatus | null>;
  getWorktreeStatus(path: string): Promise<WorktreeStatus | null>;
  listBranches(path: string): Promise<readonly Branch[]>;
  listCommits(path: string, branch?: string, limit?: number): Promise<readonly CommitSummary[]>;
  getCommit(path: string, sha: string): Promise<CommitDetail>;

  run(operation: GitOperation, repoPath: string, payload?: Record<string, unknown>): Promise<GitOperationResult>;
  /** Run an operation inside a throwaway sandbox repository. */
  runInSandbox(operation: GitOperation, sandboxSeed: string, payload?: Record<string, unknown>): Promise<GitOperationResult>;
}

/** Shared description of why the browser preview cannot run a Git operation. */
export const WEB_FALLBACK_MESSAGE =
  "This operation requires the GitOS desktop runtime. Open the app in the native Tauri shell to execute Git operations. In browser preview, Git operations are not executed; this keeps preview safe and transparent.";
