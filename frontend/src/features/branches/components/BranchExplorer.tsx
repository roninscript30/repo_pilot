import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { SearchInput } from "@/components/ui/SearchInput";
import { Spinner } from "@/components/ui/Spinner";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/toast-context";
import {
  useLocalBranches,
  useLocalCommits,
  useLocalWorktree,
  useRunGitOperation,
} from "@/features/git/hooks";
import { timeAgo } from "@/lib/format";
import type { Branch } from "@/domain/models/branch";
import type { GitOperation } from "@/domain/ports/git-runtime";

interface BranchExplorerProps {
  readonly path: string;
}

/**
 * The Branches activity: create, checkout, rename and delete local
 * branches, with a commit history pane for the selected branch.
 */
export function BranchExplorer({ path }: BranchExplorerProps) {
  const { toast } = useToast();
  const worktree = useLocalWorktree(path);
  const branchesQuery = useLocalBranches(path);
  const run = useRunGitOperation(path);

  const currentBranch = worktree.data?.currentBranch ?? null;
  const branches = useMemo(() => branchesQuery.data ?? [], [branchesQuery.data]);

  const [filter, setFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Branch | null>(null);
  const [newName, setNewName] = useState("");
  const [detail, setDetail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return branches;
    return branches.filter((branch) => branch.name.toLowerCase().includes(needle));
  }, [branches, filter]);

  const detailBranch = branches.find((branch) => branch.name === detail) ?? null;
  const commits = useLocalCommits(path, detailBranch?.name ?? null, 20, detailBranch !== null);

  function execute(operation: GitOperation, payload?: Record<string, unknown>) {
    setBusy(true);
    run.mutate(payload === undefined ? { operation } : { operation, payload }, {
      onSuccess: (outcome) => {
        setBusy(false);
        toast(
          outcome.ok
            ? { title: operationLabel(operation), description: outcome.message, tone: "success" }
            : { title: operationLabel(operation), description: outcome.message, tone: "error" },
        );
        if (outcome.ok) {
          setCreateOpen(false);
          setRenameTarget(null);
        }
      },
    });
  }

  if (worktree.isLoading || branchesQuery.isLoading) {
    return (
      <div className="flex justify-center py-14">
        <Spinner label="Reading branches…" size="sm" />
      </div>
    );
  }

  if (worktree.isError || branchesQuery.isError) {
    return (
      <div className="px-6 py-12">
        <EmptyState
          title="Branches unavailable"
          description={
            branchesQuery.error instanceof Error
              ? branchesQuery.error.message
              : "The linked path does not look like a Git repository."
          }
        />
      </div>
    );
  }

  return (
    <div className="grid min-h-[480px] grid-cols-1 items-start gap-4 px-6 py-5 xl:grid-cols-[minmax(360px,460px)_1fr]">
      <Card>
        <CardHeader
          title="Branches"
          subtitle={`${branches.length} local`}
          action={
            <Button size="sm" variant="primary" onClick={() => setCreateOpen(true)}>
              <Icon name="plus" size={12} />
              New branch
            </Button>
          }
        />
        <div className="border-b border-surface-100 px-3 py-2 dark:border-surface-700/60">
          <SearchInput value={filter} onChange={setFilter} placeholder="Filter branches…" />
        </div>
        <ul className="max-h-[420px] overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-3 py-8 text-center text-xs text-surface-500">
              {filter ? "No branches match the filter." : "No branches yet."}
            </li>
          ) : (
            filtered.map((branch) => (
              <BranchRow
                key={branch.name}
                branch={branch}
                current={branch.name === currentBranch}
                selected={branch.name === detail}
                busy={busy}
                onSelect={() => setDetail(branch.name)}
                onCheckout={() => execute("checkout", { branch: branch.name })}
                onRename={() => {
                  setRenameTarget(branch);
                  setNewName(branch.name);
                }}
                onDelete={() => execute("delete-branch", { branch: branch.name, force: false })}
              />
            ))
          )}
        </ul>
      </Card>

      <Card>
        <CardHeader
          title={detailBranch ? detailBranch.name : "Branch history"}
          subtitle={detailBranch ? "Recent commits" : "Select a branch to inspect"}
        />
        {detailBranch ? (
          commits.isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner label="Loading history…" size="sm" />
            </div>
          ) : (commits.data ?? []).length === 0 ? (
            <p className="px-4 py-10 text-center text-xs text-surface-500">
              No commits on this branch.
            </p>
          ) : (
            <ul className="divide-y divide-surface-100 dark:divide-surface-700/60">
              {(commits.data ?? []).map((commit) => (
                <li key={commit.sha} className="flex items-center gap-3 px-4 py-2.5">
                  <Icon name="gitCommit" size={13} className="shrink-0 text-surface-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-surface-700 dark:text-surface-300">
                      {commit.subject}
                    </p>
                    <p className="truncate text-2xs text-surface-400">
                      {commit.author.name} · {timeAgo(commit.committedAt)}
                    </p>
                  </div>
                  <code className="shrink-0 text-2xs text-surface-400">{commit.shortSha}</code>
                </li>
              ))}
            </ul>
          )
        ) : (
          <p className="px-4 py-10 text-center text-xs text-surface-500">
            Pick a branch to see its recent commits.
          </p>
        )}
      </Card>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New branch"
        description="Create a branch from the current HEAD."
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={newName.trim().length === 0 || busy}
              onClick={() => execute("create-branch", { name: newName.trim() })}
            >
              Create branch
            </Button>
          </div>
        }
      >
        <TextField
          label="Name"
          placeholder="feature/my-change"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          autoFocus
        />
      </Dialog>

      <Dialog
        open={renameTarget !== null}
        onClose={() => setRenameTarget(null)}
        title={`Rename ${renameTarget?.name ?? ""}`}
        description="Renames the local branch and its reflog."
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={!renameTarget || newName.trim().length === 0 || newName === renameTarget.name || busy}
              onClick={() => renameTarget && execute("rename-branch", { oldName: renameTarget.name, newName: newName.trim() })}
            >
              Rename branch
            </Button>
          </div>
        }
      >
        <TextField
          label="New name"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          autoFocus
        />
      </Dialog>
    </div>
  );
}

function BranchRow({
  branch,
  current,
  selected,
  busy,
  onSelect,
  onCheckout,
  onRename,
  onDelete,
}: {
  branch: Branch;
  current: boolean;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
  onCheckout: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <li
      className={`flex items-center gap-2 px-3 py-2 ${
        selected ? "bg-accent-50 dark:bg-accent-900/30" : "hover:bg-surface-100 dark:hover:bg-surface-700/50"
      }`}
    >
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={onSelect}
        title={branch.name}
      >
        <span className="flex items-center gap-1.5 text-xs font-medium text-surface-700 dark:text-surface-300">
          <Icon name="gitBranch" size={12} className="shrink-0 text-surface-400" />
          <span className="truncate">{branch.name}</span>
          {current ? <Badge tone="accent">current</Badge> : null}
        </span>
        {branch.latestCommit ? (
          <span className="ml-4 text-2xs text-surface-400">
            {branch.latestCommit.shortSha} · {timeAgo(branch.latestCommit.committedAt)}
          </span>
        ) : null}
      </button>
      <DropdownMenu
        ariaLabel={`Actions for ${branch.name}`}
        placement="bottom-end"
        items={[
          {
            id: "checkout",
            label: "Checkout",
            icon: "gitBranch",
            disabled: current || busy,
            onSelect: onCheckout,
          },
          { id: "rename", label: "Rename…", icon: "pencil", disabled: busy, onSelect: onRename },
          {
            id: "delete",
            label: "Delete branch",
            icon: "trash",
            danger: true,
            disabled: current || busy,
            onSelect: onDelete,
          },
        ]}
        trigger={
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-md text-surface-400 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-700/60"
            aria-label={`Actions for ${branch.name}`}
          >
            <Icon name="more" size={14} />
          </button>
        }
      />
    </li>
  );
}

function operationLabel(operation: GitOperation): string {
  switch (operation) {
    case "checkout":
      return "Checked out";
    case "create-branch":
      return "Branch created";
    case "rename-branch":
      return "Branch renamed";
    case "delete-branch":
      return "Branch deleted";
    default:
      return operation;
  }
}
