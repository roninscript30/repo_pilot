import type { WorktreeFile, WorktreeFileState } from "@/domain/models/git";
import type { WorktreeStatus } from "@/domain/ports/git-runtime";

/** Group working tree files by state, preserving per-area counts. */
export interface WorktreeGroups {
  readonly staged: readonly WorktreeFile[];
  readonly unstaged: readonly WorktreeFile[];
  readonly untracked: readonly WorktreeFile[];
  readonly ignored: readonly WorktreeFile[];
  readonly conflicted: readonly WorktreeFile[];
}

export function groupWorktreeFiles(files: readonly WorktreeFile[]): WorktreeGroups {
  const staged: WorktreeFile[] = [];
  const unstaged: WorktreeFile[] = [];
  const untracked: WorktreeFile[] = [];
  const ignored: WorktreeFile[] = [];
  const conflicted: WorktreeFile[] = [];
  for (const file of files) {
    switch (file.state) {
      case "staged":
        staged.push(file);
        break;
      case "unstaged":
        unstaged.push(file);
        break;
      case "untracked":
        untracked.push(file);
        break;
      case "ignored":
        ignored.push(file);
        break;
      case "conflicted":
        conflicted.push(file);
        break;
    }
  }
  return { staged, unstaged, untracked, ignored, conflicted };
}

export function totalAdditions(files: readonly WorktreeFile[]): number {
  return files.reduce(
    (sum, file) => sum + file.stagedAdditions + file.unstagedAdditions,
    0,
  );
}

export function totalDeletions(files: readonly WorktreeFile[]): number {
  return files.reduce(
    (sum, file) => sum + file.stagedDeletions + file.unstagedDeletions,
    0,
  );
}

export function totalChanges(status: WorktreeStatus | null | undefined): number {
  if (!status) return 0;
  return status.staged.length + status.unstaged.length + status.untracked.length;
}

export function isDirty(status: WorktreeStatus | null | undefined): boolean {
  return totalChanges(status) > 0;
}

export function hasConflicts(status: WorktreeStatus | null | undefined): boolean {
  if (!status) return false;
  return status.files.some((file) => file.state === "conflicted");
}

export function filesByState(
  status: WorktreeStatus | null | undefined,
  state: WorktreeFileState,
): readonly WorktreeFile[] {
  if (!status) return [];
  return status.files.filter((file) => file.state === state);
}
