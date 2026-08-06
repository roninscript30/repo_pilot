import { useState } from "react";
import { GitOperationsPanel } from "@/components/git/GitOperationsPanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { Icon } from "@/components/ui/Icon";
import { resolveGitRuntime } from "@/services/runtime";
import type { GitRuntime, WorktreeStatus } from "@/domain/ports/git-runtime";

/**
 * Local repositories page.
 *
 * Lists a local repository's worktree status and exposes the visual
 * Git operation surface. In browser preview the runtime reports
 * "requires desktop runtime" transparently; in the Tauri shell it
 * executes real gitoxide-backed operations.
 */
export function LocalReposPage() {
  const runtime: GitRuntime = resolveGitRuntime();
  const [repoPath, setRepoPath] = useState("");
  const [status, setStatus] = useState<WorktreeStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  async function openRepository() {
    setStatusError(null);
    if (!repoPath.trim()) {
      setStatusError("Enter a path to a local Git repository.");
      return;
    }
    try {
      const worktree = await runtime.openRepository(repoPath.trim());
      if (!worktree) {
        setStatus(null);
        setStatusError(
          runtime.kind === "web-fallback"
            ? "Browser preview cannot open local repositories. Use the desktop app."
            : "No Git repository found at that path.",
        );
        return;
      }
      setStatus(worktree);
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Failed to open the repository.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <div className="mb-5">
        <h1 className="text-lg font-bold text-surface-900 dark:text-surface-100">Local Repositories</h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Open a local Git repository and operate on it visually. Status snapshots and Git
          operations run through the GitRuntime seam.
        </p>
      </div>

      <div className="mb-4">
        <Card>
          <CardHeader
            title="Open repository"
            subtitle="Absolute path to a local Git working tree"
            action={<Badge>{runtime.kind}</Badge>}
          />
          <div className="flex items-end gap-3 p-4">
            <div className="flex-1">
              <TextField
                label="Repository path"
                value={repoPath}
                onChange={(event) => setRepoPath(event.target.value)}
                placeholder="/home/you/code/your-repo"
                className="font-mono text-xs"
              />
            </div>
            <Button onClick={() => void openRepository()}>Open</Button>
          </div>
          {statusError ? (
            <p role="alert" className="flex items-center gap-1.5 px-4 pb-3 text-xs text-danger-600 dark:text-danger-500">
              <Icon name="alertCircle" size={13} />
              {statusError}
            </p>
          ) : null}
        </Card>
      </div>

      {status ? (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Card>
            <CardHeader title="Branch" />
            <div className="p-4">
              <p className="flex items-center gap-2 font-mono text-sm text-surface-900 dark:text-surface-100">
                <Icon name="gitBranch" size={13} className="text-surface-400" />
                {status.currentBranch ?? "detached"}
              </p>
              <p className="mt-1 flex items-center gap-3 text-2xs text-surface-400">
                <span className="inline-flex items-center gap-1">
                  <Icon name="gitAhead" size={11} className="text-success-600 dark:text-success-500" />
                  {status.aheadBy} ahead
                </span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="gitBehind" size={11} className="text-warning-600 dark:text-warning-500" />
                  {status.behindBy} behind
                </span>
              </p>
            </div>
          </Card>
          <Card>
            <CardHeader title="Working tree" />
            <ul className="space-y-0.5 p-4 text-xs text-surface-600 dark:text-surface-300">
              <li className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-success-500" />
                Staged: {status.staged.length}
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-warning-500" />
                Unstaged: {status.unstaged.length}
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-surface-300 dark:bg-surface-500" />
                Untracked: {status.untracked.length}
              </li>
            </ul>
          </Card>
        </div>
      ) : null}

      {repoPath.trim() ? (
        <GitOperationsPanel runtime={runtime} repoPath={repoPath.trim()} />
      ) : null}
    </div>
  );
}
