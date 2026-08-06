import { invoke } from "@tauri-apps/api/core";
import type { Branch } from "@/domain/models/branch";
import type { CommitDetail, CommitSummary } from "@/domain/models/commit";
import type {
  GitOperation,
  GitOperationResult,
  GitRuntime,
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
      throw new Error("The GitOS desktop runtime is required for local Git operations.");
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
