import type { Branch } from "../models/branch";
import type { CommitDetail, CommitSummary } from "../models/commit";
import type {
  FileDiff,
  MergePreview,
  RefComparison,
  SyncLog,
  TagInfo,
  WorktreeFile,
} from "../models/git";

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
  | "create-tag"
  | "delete-tag"
  | "stash"
  | "compare-branches";

export type ResetMode = "soft" | "mixed" | "hard";

/** Local repository snapshot used by the UI. */
export interface WorktreeStatus {
  readonly repoPath: string;
  readonly currentBranch: string | null;
  readonly headSha: string | null;
  readonly trackingBranch: string | null;
  readonly aheadBy: number;
  readonly behindBy: number;
  /** Per-file detail; the grouped path lists below are derived views. */
  readonly files: readonly WorktreeFile[];
  readonly staged: readonly string[];
  readonly unstaged: readonly string[];
  readonly untracked: readonly string[];
  readonly ignored: readonly string[];
}

export interface GitOperationResult {
  readonly ok: boolean;
  /** Human-readable, safe to display. */
  readonly message: string;
  /** Present when the runtime cannot execute the operation. */
  readonly unsupported?: boolean;
}

/** Which two states a file diff compares. */
export interface FileDiffSpec {
  readonly path: string;
  /** Left side of the diff. */
  readonly base: "HEAD" | "index";
  /** Right side of the diff. */
  readonly target: "index" | "worktree";
}

/** Optional clone knobs (all optional; `exactOptionalPropertyTypes`). */
export interface CloneOptions {
  readonly depth?: number;
  readonly branch?: string;
  /** GitHub account whose token authorizes an HTTPS clone. */
  readonly accountLogin?: string;
}

/** Input for the desktop `git clone` flow. */
export interface CloneInput extends CloneOptions {
  readonly url: string;
  readonly targetDir: string;
  /** Correlates progress events streamed as `git://progress`. */
  readonly operationId: string;
}

/** Reported system-git availability. */
export interface GitVersion {
  readonly version: string | null;
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
  getFileDiff(path: string, spec: FileDiffSpec): Promise<FileDiff | null>;
  /** Per-file diffs between any two resolvable refs (branches/tags/SHAs). */
  diffFiles(path: string, baseRef: string, targetRef: string): Promise<readonly FileDiff[]>;
  /** Local tag names and the commits they point at. */
  listLocalTags(path: string): Promise<readonly TagInfo[]>;
  compareRefs(path: string, baseRef: string, targetRef: string): Promise<RefComparison>;
  mergePreview(path: string, headRef: string, targetRef: string): Promise<MergePreview>;
  getSyncLog(path: string): Promise<SyncLog>;

  cloneRepository(input: CloneInput): Promise<GitOperationResult>;
  getGitVersion(): Promise<GitVersion>;

  run(operation: GitOperation, repoPath: string, payload?: Record<string, unknown>): Promise<GitOperationResult>;
  /** Run an operation inside a throwaway sandbox repository. */
  runInSandbox(operation: GitOperation, sandboxSeed: string, payload?: Record<string, unknown>): Promise<GitOperationResult>;
}

/** Shared description of why the browser preview cannot run a Git operation. */
export const WEB_FALLBACK_MESSAGE =
  "This operation requires the Repo Pilot desktop runtime. Open the app in the native Tauri shell to execute Git operations. In browser preview, Git operations are not executed; this keeps preview safe and transparent.";
