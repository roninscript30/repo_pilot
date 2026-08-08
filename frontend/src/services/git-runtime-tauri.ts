import { invoke } from "@tauri-apps/api/core";
import type { Branch } from "@/domain/models/branch";
import type { CommitDetail, CommitSummary } from "@/domain/models/commit";
import type { FileDiff, MergePreview, RefComparison, SyncLog, TagInfo } from "@/domain/models/git";
import type {
  CloneInput,
  FileDiffSpec,
  GitOperation,
  GitOperationResult,
  GitRuntime,
  GitVersion,
  WorktreeStatus,
} from "@/domain/ports/git-runtime";

/**
 * Desktop GitRuntime backed by the Tauri shell.
 *
 * Every method maps to a Rust command implemented with gitoxide.
 * When the app runs in a plain browser, these commands are not
 * available and the web fallback (WebFallbackGitRuntime) is used instead.
 */
export class TauriGitRuntime implements GitRuntime {
  readonly kind = "tauri" as const;

  private readonly available: boolean;

  constructor() {
    this.available = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  }

  private guard(): void {
    if (!this.available) {
      throw new Error("The Repo Pilot desktop runtime is required for local Git operations.");
    }
  }

  async openRepository(path: string): Promise<WorktreeStatus | null> {
    this.guard();
    return invoke<WorktreeStatus | null>("git_open_repository", { path });
  }

  async getWorktreeStatus(path: string): Promise<WorktreeStatus | null> {
    this.guard();
    return invoke<WorktreeStatus | null>("git_worktree_status", { path });
  }

  async listBranches(path: string): Promise<readonly Branch[]> {
    this.guard();
    return invoke<Branch[]>("git_list_branches", { path });
  }

  async listCommits(path: string, branch?: string, limit?: number): Promise<readonly CommitSummary[]> {
    this.guard();
    return invoke<CommitSummary[]>("git_list_commits", { path, branch, limit });
  }

  async getCommit(path: string, sha: string): Promise<CommitDetail> {
    this.guard();
    return invoke<CommitDetail>("git_get_commit", { path, sha });
  }

  async getFileDiff(path: string, spec: FileDiffSpec): Promise<FileDiff | null> {
    this.guard();
    return invoke<FileDiff | null>("git_file_diff", { path, spec });
  }

  async diffFiles(path: string, baseRef: string, targetRef: string): Promise<readonly FileDiff[]> {
    this.guard();
    return invoke<FileDiff[]>("git_diff_files", { path, baseRef, targetRef });
  }

  async listLocalTags(path: string): Promise<readonly TagInfo[]> {
    this.guard();
    return invoke<TagInfo[]>("git_tag_list", { path });
  }

  async compareRefs(path: string, baseRef: string, targetRef: string): Promise<RefComparison> {
    this.guard();
    return invoke<RefComparison>("git_compare_refs", { path, baseRef, targetRef });
  }

  async mergePreview(path: string, headRef: string, targetRef: string): Promise<MergePreview> {
    this.guard();
    return invoke<MergePreview>("git_merge_preview", { path, headRef, targetRef });
  }

  async getSyncLog(path: string): Promise<SyncLog> {
    this.guard();
    return invoke<SyncLog>("git_sync_log", { path });
  }

  async cloneRepository(input: CloneInput): Promise<GitOperationResult> {
    this.guard();
    // Build args without undefined keys (`exactOptionalPropertyTypes`).
    const args: Record<string, unknown> = {
      url: input.url,
      targetDir: input.targetDir,
      operationId: input.operationId,
    };
    if (input.depth !== undefined) args.depth = input.depth;
    if (input.branch !== undefined) args.branch = input.branch;
    if (input.accountLogin !== undefined) args.accountLogin = input.accountLogin;
    return invoke<GitOperationResult>("git_clone", { args });
  }

  async getGitVersion(): Promise<GitVersion> {
    this.guard();
    return invoke<GitVersion>("git_git_version");
  }

  async run(
    operation: GitOperation,
    repoPath: string,
    payload?: Record<string, unknown>,
  ): Promise<GitOperationResult> {
    this.guard();
    return invoke<GitOperationResult>("git_run_operation", {
      operation,
      repoPath,
      payload: payload ?? {},
    });
  }

  async runInSandbox(
    operation: GitOperation,
    sandboxSeed: string,
    payload?: Record<string, unknown>,
  ): Promise<GitOperationResult> {
    this.guard();
    return invoke<GitOperationResult>("git_run_in_sandbox", {
      operation,
      sandboxSeed,
      payload: payload ?? {},
    });
  }
}
