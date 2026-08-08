import type { Branch } from "@/domain/models/branch";
import type { CommitDetail, CommitSummary } from "@/domain/models/commit";
import type { FileDiff, MergePreview, RefComparison, SyncLog, TagInfo } from "@/domain/models/git";
import type {
  GitOperation,
  GitOperationResult,
  GitRuntime,
  GitVersion,
  WorktreeStatus,
} from "@/domain/ports/git-runtime";
import { WEB_FALLBACK_MESSAGE } from "@/domain/ports/git-runtime";

const EMPTY_SYNC_LOG: SyncLog = { fetchAt: null, pullAt: null, pushAt: null };

/**
 * Browser-preview GitRuntime.
 *
 * Repo Pilot does not pretend to execute Git in the browser. Every Git
 * operation reports a transparent "requires desktop runtime" result so
 * the UI stays fully testable while never faking repository state
 * (ADR-0006).
 */
export class WebFallbackGitRuntime implements GitRuntime {
  readonly kind = "web-fallback" as const;

  private unsupported(): GitOperationResult {
    return { ok: false, unsupported: true, message: WEB_FALLBACK_MESSAGE };
  }

  async openRepository(): Promise<WorktreeStatus | null> {
    return null;
  }

  async getWorktreeStatus(): Promise<WorktreeStatus | null> {
    return null;
  }

  async listBranches(): Promise<readonly Branch[]> {
    return [];
  }

  async listCommits(): Promise<readonly CommitSummary[]> {
    return [];
  }

  async getCommit(): Promise<CommitDetail> {
    throw new Error("The desktop runtime is required to read local commit details.");
  }

  async getFileDiff(): Promise<FileDiff | null> {
    return null;
  }

  async diffFiles(): Promise<readonly FileDiff[]> {
    return [];
  }

  async listLocalTags(): Promise<readonly TagInfo[]> {
    return [];
  }

  async compareRefs(): Promise<RefComparison> {
    throw new Error("The desktop runtime is required to compare local refs.");
  }

  async mergePreview(): Promise<MergePreview> {
    throw new Error("The desktop runtime is required to preview local merges.");
  }

  async getSyncLog(): Promise<SyncLog> {
    return EMPTY_SYNC_LOG;
  }

  async cloneRepository(): Promise<GitOperationResult> {
    return this.unsupported();
  }

  async getGitVersion(): Promise<GitVersion> {
    return { version: null };
  }

  async run(
    _operation: GitOperation,
    _repoPath: string,
    _payload?: Record<string, unknown>,
  ): Promise<GitOperationResult> {
    return this.unsupported();
  }

  async runInSandbox(
    _operation: GitOperation,
    _sandboxSeed: string,
    _payload?: Record<string, unknown>,
  ): Promise<GitOperationResult> {
    return this.unsupported();
  }
}
