import { useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SelectField } from "@/components/ui/SelectField";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/toast-context";
import { useGitProgress, useLocalWorktree, useRunGitOperation, useSyncLog } from "@/features/git/hooks";
import { fetchPayload, pullPayload, pushPayload } from "@/features/git/lib/payloads";
import { remoteNameFor } from "@/features/git/lib/remotes";
import { useLocalReposStore } from "@/features/local/store";
import { useAuthStore } from "@/stores/auth-store";
import { timeAgo } from "@/lib/format";
import type { GitOperation } from "@/domain/ports/git-runtime";

const NETWORK_OPERATION_ID = "git-run-operation";

interface SyncCenterProps {
  readonly path: string;
  /** Navigate to the compare activity when the user asks to compare. */
  readonly onCompare?: () => void;
}

/**
 * The Sync activity: full local↔remote relationship (branch, tracking
 * branch, remote, incoming/outgoing commit counts, last sync times), a
 * per-remote account picker, and Fetch / Pull / Push / Sync / Refresh /
 * Compare actions with streaming progress. Everything flows through the
 * GitRuntime port so browser preview stays transparent (ADR-0006).
 */
export function SyncCenter({ path, onCompare }: SyncCenterProps) {
  const { toast } = useToast();
  const worktree = useLocalWorktree(path);
  const syncLog = useSyncLog(path);
  const run = useRunGitOperation(path);
  const progress = useGitProgress(NETWORK_OPERATION_ID);

  const accounts = useAuthStore((state) => state.accounts);
  const activeLogin = useAuthStore((state) => state.account?.login ?? null);
  const accountLogins = useLocalReposStore((state) => {
    const entry = state.repositories.find((candidate) => candidate.path === path);
    return entry?.accountLogins ?? {};
  });
  const setAccountLogin = useLocalReposStore((state) => state.setAccountLogin);

  const status = worktree.data ?? null;
  const remote = remoteNameFor(status?.trackingBranch ?? null);
  const accountLogin = (remote ? accountLogins[remote] : undefined) ?? activeLogin;

  const accountOptions = useMemo(() => {
    const options = [
      {
        value: "",
        label: activeLogin ? `${activeLogin} (active)` : "No account",
      },
      ...accounts
        .filter((account) => account.login !== activeLogin)
        .map((account) => ({ value: account.login, label: account.displayName })),
    ];
    return options;
  }, [accounts, activeLogin]);

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

  function authOptions() {
    return accountLogin ? { accountLogin } : {};
  }

  function branchOption() {
    return status?.currentBranch ? { branch: status.currentBranch } : {};
  }

  async function runNetwork(operation: GitOperation, payload: Record<string, unknown>): Promise<boolean> {
    const outcome = await run.mutateAsync({ operation, payload });
    const tone = outcome.ok ? "success" : "error";
    toast({ title: operationLabel(operation), description: outcome.message, tone });
    return outcome.ok;
  }

  async function handleFetch() {
    await runNetwork("fetch", fetchPayload(undefined, authOptions()));
  }

  async function handlePull() {
    await runNetwork("pull", pullPayload(undefined, { ...authOptions(), ...branchOption(), rebase: false }));
  }

  async function handlePush() {
    await runNetwork(
      "push",
      pushPayload(undefined, { ...authOptions(), ...branchOption(), setUpstream: remoteMissing }),
    );
  }

  async function handleSync() {
    const fetched = await runNetwork("fetch", fetchPayload(undefined, authOptions()));
    if (!fetched) return;
    const pulled = await runNetwork(
      "pull",
      pullPayload(undefined, { ...authOptions(), ...branchOption(), rebase: true }),
    );
    if (!pulled) return;
    await handlePush();
  }

  function handleRefresh() {
    void worktree.refetch();
    void syncLog.refetch();
    toast({ title: "Refreshed", description: "Branch state and sync log reloaded.", tone: "info" });
  }

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
            {remote ? <Badge tone="accent">{remote}</Badge> : null}
          </div>

          {remoteMissing ? (
            <p className="flex items-start gap-2 text-xs text-surface-500">
              <Icon name="alertCircle" size={13} className="mt-0.5 shrink-0" />
              This branch has no upstream. Push will set one on {remote ?? "origin"} automatically.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-surface-200 p-3 text-center dark:border-surface-600">
                <p className="inline-flex items-center gap-1 text-lg font-bold text-success-600 dark:text-success-400">
                  <Icon name="gitAhead" size={15} />
                  {status.aheadBy}
                </p>
                <p className="text-2xs text-surface-500">outgoing (to push)</p>
              </div>
              <div className="rounded-lg border border-surface-200 p-3 text-center dark:border-surface-600">
                <p className="inline-flex items-center gap-1 text-lg font-bold text-warning-600 dark:text-warning-400">
                  <Icon name="gitBehind" size={15} />
                  {status.behindBy}
                </p>
                <p className="text-2xs text-surface-500">incoming (to pull)</p>
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
            <Button size="sm" variant="secondary" disabled={run.isPending} onClick={() => void handleFetch()}>
              <Icon name="refresh" size={13} />
              Fetch
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={run.isPending || remoteMissing || status.behindBy === 0}
              onClick={() => void handlePull()}
            >
              <Icon name="gitPull" size={13} />
              Pull
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={run.isPending || (remoteMissing ? status.aheadBy === 0 : status.aheadBy === 0 && clean)}
              onClick={() => void handlePush()}
            >
              <Icon name="gitPush" size={13} />
              {remoteMissing ? "Set upstream & Push" : "Push"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={run.isPending || remoteMissing}
              onClick={() => void handleSync()}
            >
              <Icon name="gitMerge" size={13} />
              Sync
            </Button>
            <Button size="sm" variant="ghost" disabled={run.isPending} onClick={handleRefresh}>
              <Icon name="refresh" size={13} />
              Refresh
            </Button>
            {onCompare ? (
              <Button size="sm" variant="ghost" onClick={onCompare}>
                <Icon name="gitCompare" size={13} />
                Compare
              </Button>
            ) : null}
          </div>

          {run.isPending || progress ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-2xs text-surface-500">
                <span className="truncate">{progress?.text ?? "Working…"}</span>
                {progress?.percent !== null && progress?.percent !== undefined ? (
                  <span className="font-mono">{progress.percent}%</span>
                ) : null}
              </div>
              {progress?.percent !== null && progress?.percent !== undefined ? (
                <ProgressBar value={progress.percent} />
              ) : (
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
                  <div className="h-full w-1/3 animate-pulse rounded-full bg-accent-500" />
                </div>
              )}
            </div>
          ) : null}
        </div>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader
            title="Remote account"
            subtitle={remote ? `Authenticates ${remote}` : "No remote detected"}
          />
          <div className="p-4">
            <SelectField
              aria-label="Remote account"
              value={remote && accountLogins[remote] ? accountLogins[remote] : ""}
              onChange={(event) => {
                if (remote) setAccountLogin(path, remote, event.target.value);
              }}
              options={accountOptions}
              disabled={!remote}
            />
            <p className="mt-2 text-2xs text-surface-500">
              Uses the OS keyring credential for the chosen GitHub account. Unset keeps the active
              account.
            </p>
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
      return "Fetch";
    case "pull":
      return "Pull";
    case "push":
      return "Push";
    default:
      return "Operation";
  }
}
