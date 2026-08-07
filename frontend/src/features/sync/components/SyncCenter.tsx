import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/toast-context";
import { useLocalWorktree, useRunGitOperation, useSyncLog } from "@/features/git/hooks";
import { timeAgo } from "@/lib/format";
import type { GitOperation } from "@/domain/ports/git-runtime";

interface SyncCenterProps {
  readonly path: string;
}

/**
 * The Sync activity: remote state of the current branch and the
 * fetch / pull / push surface. Everything flows through the GitRuntime
 * port so browser preview stays transparent (ADR-0006).
 */
export function SyncCenter({ path }: SyncCenterProps) {
  const { toast } = useToast();
  const worktree = useLocalWorktree(path);
  const syncLog = useSyncLog(path);
  const run = useRunGitOperation(path);

  const status = worktree.data ?? null;

  function execute(operation: GitOperation) {
    run.mutate({ operation }, {
      onSuccess: (outcome) => {
        toast(
          outcome.ok
            ? { title: operationLabel(operation), description: outcome.message, tone: "success" }
            : { title: operationLabel(operation), description: outcome.message, tone: "error" },
        );
      },
    });
  }

  if (worktree.isLoading) {
    return (
      <div className="flex justify-center py-14">
        <Spinner label="Reading branch state…" size="sm" />
      </div>
    );
  }

  if (worktree.isError || !status) {
    return (
      <div className="px-6 py-12">
        <EmptyState
          title="Sync unavailable"
          description={
            worktree.error instanceof Error
              ? worktree.error.message
              : "The linked path does not look like a Git repository."
          }
        />
      </div>
    );
  }

  const remoteMissing = status.trackingBranch === null;
  const diverged = status.aheadBy > 0 && status.behindBy > 0;
  const clean = status.aheadBy === 0 && status.behindBy === 0;

  return (
    <div className="grid min-h-[480px] grid-cols-1 items-start gap-4 px-6 py-5 xl:grid-cols-2">
      <Card>
        <CardHeader
          title="Branch status"
          subtitle={status.currentBranch ?? "detached HEAD"}
        />
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-surface-800 dark:text-surface-200">
              <Icon name="gitBranch" size={14} />
              {status.currentBranch ?? "detached HEAD"}
            </span>
            {status.trackingBranch ? (
              <Badge tone="neutral">{status.trackingBranch}</Badge>
            ) : (
              <Badge tone="warning">no upstream</Badge>
            )}
          </div>

          {remoteMissing ? (
            <p className="flex items-start gap-2 text-xs text-surface-500">
              <Icon name="alertCircle" size={13} className="mt-0.5 shrink-0" />
              This branch has no upstream. Use the Branch Explorer to set a tracking
              branch, then sync will report ahead/behind state.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-surface-200 p-3 text-center dark:border-surface-600">
                <p className="inline-flex items-center gap-1 text-lg font-bold text-success-600 dark:text-success-400">
                  <Icon name="gitAhead" size={15} />
                  {status.aheadBy}
                </p>
                <p className="text-2xs text-surface-500">ahead (to push)</p>
              </div>
              <div className="rounded-lg border border-surface-200 p-3 text-center dark:border-surface-600">
                <p className="inline-flex items-center gap-1 text-lg font-bold text-warning-600 dark:text-warning-400">
                  <Icon name="gitBehind" size={15} />
                  {status.behindBy}
                </p>
                <p className="text-2xs text-surface-500">behind (to pull)</p>
              </div>
            </div>
          )}

          {!remoteMissing && (clean || diverged) ? (
            <p className="text-xs text-surface-500">
              {diverged
                ? "Local and remote have diverged — fetch to confirm, then pull or push."
                : clean
                  ? "Local and remote are in sync."
                  : null}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 border-t border-surface-100 pt-3 dark:border-surface-700/60">
            <Button
              size="sm"
              variant="secondary"
              disabled={run.isPending}
              onClick={() => execute("fetch")}
            >
              <Icon name="refresh" size={13} />
              Fetch
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={run.isPending || remoteMissing || status.behindBy === 0}
              onClick={() => execute("pull")}
            >
              <Icon name="gitPull" size={13} />
              Pull
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={run.isPending || remoteMissing || status.aheadBy === 0}
              onClick={() => execute("push")}
            >
              <Icon name="gitPush" size={13} />
              Push
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Sync log" subtitle="Last synchronization events" />
        <ul className="divide-y divide-surface-100 dark:divide-surface-700/60">
          <SyncLogRow label="Fetched" at={syncLog.data?.fetchAt ?? null} icon="cloud" />
          <SyncLogRow label="Pulled" at={syncLog.data?.pullAt ?? null} icon="gitPull" />
          <SyncLogRow label="Pushed" at={syncLog.data?.pushAt ?? null} icon="gitPush" />
        </ul>
      </Card>
    </div>
  );
}

function SyncLogRow({
  label,
  at,
  icon,
}: {
  label: string;
  at: string | null;
  icon: "cloud" | "gitPull" | "gitPush";
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="inline-flex items-center gap-2 text-xs text-surface-700 dark:text-surface-300">
        <Icon name={icon} size={13} />
        {label}
      </span>
      {at ? (
        <span className="text-2xs text-surface-400" title={at}>
          {timeAgo(at)}
        </span>
      ) : (
        <span className="text-2xs text-surface-400">never</span>
      )}
    </li>
  );
}

function operationLabel(operation: GitOperation): string {
  switch (operation) {
    case "fetch":
      return "Fetched";
    case "pull":
      return "Pulled";
    case "push":
      return "Pushed";
    default:
      return operation;
  }
}
