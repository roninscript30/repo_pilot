import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/toast-context";
import { DiffViewer } from "@/features/git/components/DiffViewer";
import { CommitCenter } from "@/features/worktree/components/CommitCenter";
import {
  useFileDiff,
  useLocalWorktree,
  useRepoChanged,
  useRunGitOperation,
} from "@/features/git/hooks";
import {
  hasConflicts,
  isDirty,
  totalAdditions,
  totalChanges,
  totalDeletions,
} from "@/features/git/lib/worktree";
import type { WorktreeFile } from "@/domain/models/git";
import type { GitOperation, WorktreeStatus } from "@/domain/ports/git-runtime";

interface WorktreeViewProps {
  readonly path: string;
}

const STATE_LABELS: Record<WorktreeFile["state"], string> = {
  staged: "Staged",
  unstaged: "Unstaged",
  untracked: "Untracked",
  ignored: "Ignored",
  conflicted: "Conflicted",
};

const STATE_TONES: Record<WorktreeFile["state"], "neutral" | "success" | "warning" | "danger" | "accent"> = {
  staged: "success",
  unstaged: "warning",
  untracked: "neutral",
  ignored: "neutral",
  conflicted: "danger",
};

/**
 * The Working Tree activity: every change on disk relative to HEAD.
 *
 * Files are grouped by state with selection-driven stage/unstage/restore,
 * and the selected file renders as a unified diff. All mutations run
 * through the GitRuntime port (ADR-0006).
 */
export function WorktreeView({ path }: WorktreeViewProps) {
  const { toast } = useToast();
  const worktree = useLocalWorktree(path);
  const run = useRunGitOperation(path);
  useRepoChanged(path);

  const status = worktree.data ?? null;

  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [diffPath, setDiffPath] = useState<string | null>(null);

  const diffSpec = diffSpecFor(status, diffPath);
  const diff = useFileDiff(path, diffSpec);

  const selectedList = [...selected];

  function execute(operation: GitOperation, payload?: Record<string, unknown>) {
    run.mutate(payload === undefined ? { operation } : { operation, payload }, {
      onSuccess: (outcome) => {
        toast(
          outcome.ok
            ? { title: operationLabel(operation), description: outcome.message, tone: "success" }
            : { title: operationLabel(operation), description: outcome.message, tone: "error" },
        );
        if (outcome.ok) {
          setSelected(new Set());
        }
      },
    });
  }

  function diffSpecFor(
    current: WorktreeStatus | null,
    target: string | null,
  ): { readonly path: string; readonly base: "HEAD" | "index"; readonly target: "index" | "worktree" } | null {
    if (!current || !target) return null;
    const file = current.files.find((candidate) => candidate.path === target);
    if (!file) return null;
    return {
      path: file.path,
      base: file.state === "staged" ? "HEAD" : "index",
      target: file.state === "staged" ? "index" : "worktree",
    };
  }

  if (worktree.isLoading) {
    return (
      <div className="flex justify-center py-14">
        <Spinner label="Reading working tree…" size="sm" />
      </div>
    );
  }

  if (worktree.isError || !status) {
    return (
      <div className="px-6 py-12">
        <EmptyState
          title="Working tree unavailable"
          description={
            worktree.error instanceof Error
              ? worktree.error.message
              : "The linked path does not look like a Git repository."
          }
          action={
            <Button size="sm" variant="secondary" onClick={() => void worktree.refetch()}>
              <Icon name="refresh" size={13} />
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  const files = status.files;
  const selectedFile = diffPath ? files.find((file) => file.path === diffPath) ?? null : null;

  return (
    <div className="flex min-h-[480px] flex-col gap-4 px-6 py-5">
      <StatusRow status={status} onRefresh={() => void worktree.refetch()} />

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(340px,440px)_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Changes"
              subtitle={totalChanges(status) > 0 ? `${totalChanges(status)} changed` : "Clean"}
            />
            <div className="flex flex-wrap items-center gap-1.5 border-b border-surface-100 px-3 py-2 dark:border-surface-700/60">
              <Button
                size="sm"
                variant="secondary"
                disabled={selectedList.length === 0 || status.staged.length > 0 && !selectedList.some((p) => !status.staged.includes(p))}
                onClick={() =>
                  execute("stage", { files: selectedList.filter((p) => !status.staged.includes(p)) })
                }
              >
                Stage selected
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={selectedList.length === 0}
                onClick={() => execute("unstage", { files: selectedList.filter((p) => status.staged.includes(p)) })}
              >
                Unstage
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={selectedList.length === 0}
                onClick={() => execute("restore", { files: selectedList })}
              >
                Discard
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={!isDirty(status)}
                onClick={() =>
                  execute("stage", { files: [...status.unstaged, ...status.untracked] })
                }
              >
                Stage all
              </Button>
            </div>
            <div className="max-h-[340px] overflow-y-auto">
              {hasConflicts(status) ? (
                <p className="flex items-center gap-1.5 px-3 py-2 text-2xs text-danger-600 dark:text-danger-400">
                  <Icon name="alertCircle" size={12} />
                  Resolve conflicts before committing.
                </p>
              ) : null}
              {files.length === 0 ? (
                <p className="px-3 py-8 text-center text-xs text-surface-500">
                  No changes — the working tree matches HEAD.
                </p>
              ) : (
                files.map((file) => (
                  <FileRow
                    key={file.path}
                    file={file}
                    checked={selected.has(file.path)}
                    selected={diffPath === file.path}
                    onToggle={() => {
                      const next = new Set(selected);
                      if (next.has(file.path)) next.delete(file.path);
                      else next.add(file.path);
                      setSelected(next);
                    }}
                    onSelect={() => setDiffPath(file.path)}
                  />
                ))
              )}
            </div>
          </Card>

          <CommitCenter
            path={path}
            status={status}
            run={run}
            onCommitted={() => setSelected(new Set())}
            onInspectFile={(filePath) => setDiffPath(filePath)}
          />
        </div>

        <Card>
          <CardHeader
            title="Diff"
            subtitle={selectedFile ? selectedFile.path : "Select a file to inspect"}
          />
          <div className="p-3">
            {selectedFile ? (
              <DiffViewer
                change={{
                  filename: selectedFile.path,
                  status: fileStatus(selectedFile),
                  additions:
                    selectedFile.state === "staged"
                      ? selectedFile.stagedAdditions
                      : selectedFile.unstagedAdditions,
                  deletions:
                    selectedFile.state === "staged"
                      ? selectedFile.stagedDeletions
                      : selectedFile.unstagedDeletions,
                }}
                patch={diff.data?.patch ?? null}
              />
            ) : (
              <p className="px-3 py-10 text-center text-xs text-surface-500">
                Pick a changed file to see its unified diff.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatusRow({
  status,
  onRefresh,
}: {
  status: WorktreeStatus;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-surface-800 dark:text-surface-200">
        <Icon name="gitBranch" size={14} />
        {status.currentBranch ?? "detached HEAD"}
        {status.headSha ? (
          <code className="rounded bg-surface-100 px-1 py-0.5 text-2xs text-surface-500 dark:bg-surface-700">
            {status.headSha.slice(0, 7)}
          </code>
        ) : null}
      </span>
      {status.trackingBranch ? (
        <Badge tone="neutral">{status.trackingBranch}</Badge>
      ) : null}
      {status.aheadBy > 0 ? (
        <span className="inline-flex items-center gap-1 text-2xs text-success-600 dark:text-success-400">
          <Icon name="gitAhead" size={12} /> {status.aheadBy} ahead
        </span>
      ) : null}
      {status.behindBy > 0 ? (
        <span className="inline-flex items-center gap-1 text-2xs text-warning-600 dark:text-warning-400">
          <Icon name="gitBehind" size={12} /> {status.behindBy} behind
        </span>
      ) : null}
      <span className="text-2xs text-surface-400">
        +{totalAdditions(status.files)} −{totalDeletions(status.files)}
      </span>
      <Button size="sm" variant="ghost" onClick={onRefresh}>
        <Icon name="refresh" size={12} />
        Refresh
      </Button>
    </div>
  );
}

function FileRow({
  file,
  checked,
  selected,
  onToggle,
  onSelect,
}: {
  file: WorktreeFile;
  checked: boolean;
  selected: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  const additions = file.state === "staged" ? file.stagedAdditions : file.unstagedAdditions;
  const deletions = file.state === "staged" ? file.stagedDeletions : file.unstagedDeletions;
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 text-xs ${
        selected ? "bg-accent-50 dark:bg-accent-900/30" : "hover:bg-surface-100 dark:hover:bg-surface-700/50"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        aria-label={`Select ${file.path}`}
        className="accent-accent-500"
      />
      <button
        type="button"
        className="min-w-0 flex-1 truncate text-left text-surface-700 hover:text-accent-600 dark:text-surface-300"
        onClick={onSelect}
        title={file.path}
      >
        {file.path}
      </button>
      <Badge tone={STATE_TONES[file.state]}>{STATE_LABELS[file.state]}</Badge>
      {additions > 0 || deletions > 0 ? (
        <span className="shrink-0 text-2xs">
          <span className="text-success-600 dark:text-success-400">+{additions}</span>{" "}
          <span className="text-danger-600 dark:text-danger-400">−{deletions}</span>
        </span>
      ) : null}
    </div>
  );
}

function fileStatus(file: WorktreeFile): "added" | "modified" | "removed" | "renamed" {
  if (file.state === "untracked") return "added";
  return "modified";
}

function operationLabel(operation: GitOperation): string {
  switch (operation) {
    case "stage":
      return "Staged";
    case "unstage":
      return "Unstaged";
    case "restore":
      return "Discarded";
    case "commit":
      return "Committed";
    default:
      return operation;
  }
}
