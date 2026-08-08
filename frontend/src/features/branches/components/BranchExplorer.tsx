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
  useCommitGraph,
  useLocalBranches,
  useLocalWorktree,
  useRunGitOperation,
} from "@/features/git/hooks";
import { BranchGraph } from "@/features/branches/components/BranchGraph";
import { CommitInspector } from "@/features/git/components/CommitInspector";
import { timeAgo } from "@/lib/format";
import type { Branch } from "@/domain/models/branch";
import type { CommitSummary } from "@/domain/models/commit";
import type { GraphNode, GraphRef } from "@/domain/models/git";
import type { GitOperation } from "@/domain/ports/git-runtime";

interface BranchExplorerProps {
  readonly path: string;
}

/** Map a graph node to the commit model the inspector consumes. */
function toCommitSummary(node: GraphNode): CommitSummary {
  return {
    sha: node.id,
    shortSha: node.id.slice(0, 7),
    message: node.subject,
    subject: node.subject,
    author: { name: node.authorName, email: node.authorEmail, login: null, avatarUrl: null },
    committedAt: new Date(node.time * 1000).toISOString(),
    parents: node.parents,
  };
}

/**
 * The Branches activity: create, checkout, rename and delete local
 * branches, with an interactive commit graph (GitKraken-style canvas)
 * for the selected branch plus a full commit inspector.
 */
export function BranchExplorer({ path }: BranchExplorerProps) {
  const { toast } = useToast();
  const worktree = useLocalWorktree(path);
  const branchesQuery = useLocalBranches(path);
  const graphQuery = useCommitGraph(path, 2000);
  const run = useRunGitOperation(path);

  const currentBranch = worktree.data?.currentBranch ?? null;
  const branches = useMemo(() => branchesQuery.data ?? [], [branchesQuery.data]);

  const [filter, setFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Branch | null>(null);
  const [newName, setNewName] = useState("");
  const [detail, setDetail] = useState<string | null>(null);
  const [selectedSha, setSelectedSha] = useState<string | null>(null);
  const [selectedRef, setSelectedRef] = useState<GraphRef | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return branches;
    return branches.filter((branch) => branch.name.toLowerCase().includes(needle));
  }, [branches, filter]);

  const nodes = useMemo(() => graphQuery.data?.nodes ?? [], [graphQuery.data?.nodes]);
  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedSha) ?? null,
    [nodes, selectedSha],
  );

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

  function graphBranchAction(label: string, icon: "gitBranch" | "pencil" | "trash", action: () => void) {
    return (
      <Button key={label} size="sm" variant="secondary" disabled={busy} onClick={action}>
        <Icon name={icon} size={12} />
        {label}
      </Button>
    );
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

  const selectedBranch = selectedRef !== null && selectedRef.kind === "branch"
    ? branches.find((branch) => branch.name === selectedRef.name) ?? null
    : null;

  return (
    <div className="grid min-h-[480px] grid-cols-1 items-start gap-4 px-6 py-5 xl:grid-cols-[minmax(300px,380px)_1fr]">
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
        <ul className="max-h-[520px] overflow-y-auto">
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
          title="Commit graph"
          subtitle="Click a commit or a ref · drag to pan, scroll to zoom"
          action={
            selectedRef !== null && selectedRef.kind === "branch" && selectedBranch ? (
              <div className="flex items-center gap-2">
                {graphBranchAction("Checkout", "gitBranch", () =>
                  execute("checkout", { branch: selectedBranch.name }),
                )}
                {graphBranchAction("Rename…", "pencil", () => {
                  setRenameTarget(selectedBranch);
                  setNewName(selectedBranch.name);
                })}
                {graphBranchAction("Delete", "trash", () =>
                  execute("delete-branch", { branch: selectedBranch.name, force: false }),
                )}
              </div>
            ) : selectedRef !== null && selectedRef.kind !== "branch" ? (
              <div className="flex items-center gap-2">
                <Badge tone="neutral">{selectedRef.kind}</Badge>
                <Button size="sm" variant="ghost" onClick={() => setSelectedRef(null)}>
                  Clear
                </Button>
              </div>
            ) : null
          }
        />
        {graphQuery.isLoading ? (
          <div className="flex justify-center py-14">
            <Spinner label="Building commit graph…" size="sm" />
          </div>
        ) : graphQuery.isError ? (
          <div className="p-6">
            <EmptyState
              title="Graph unavailable"
              description={
                graphQuery.error instanceof Error
                  ? graphQuery.error.message
                  : "The commit graph could not be built."
              }
            />
          </div>
        ) : (
          <div className="p-3">
            <BranchGraph
              nodes={nodes}
              selectedSha={selectedSha}
              selectedRef={selectedRef}
              onSelectCommit={(sha) => {
                setSelectedSha(sha);
                setSelectedRef(null);
              }}
              onSelectRef={(ref) => {
                setSelectedRef(ref);
                if (ref !== null && ref.kind === "branch") setDetail(ref.name);
              }}
            />
            {selectedNode ? (
              <div className="mt-3 border-t border-surface-100 pt-3 dark:border-surface-700/60">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge tone={selectedNode.isMerge ? "accent" : "neutral"}>
                    {selectedNode.isMerge ? "merge commit" : "commit"}
                  </Badge>
                  <code className="text-2xs text-surface-400">{selectedNode.id.slice(0, 12)}</code>
                  {selectedNode.refs.length > 0 ? (
                    selectedNode.refs.map((ref) => (
                      <Badge key={`${ref.kind}-${ref.name}`} tone={ref.kind === "head" ? "neutral" : "accent"}>
                        {ref.name}
                      </Badge>
                    ))
                  ) : null}
                </div>
                <CommitInspector
                  fullName="local"
                  commit={toCommitSummary(selectedNode)}
                  localPath={path}
                />
              </div>
            ) : (
              <p className="mt-3 border-t border-surface-100 pt-3 text-center text-2xs text-surface-400 dark:border-surface-700/60">
                {detail ? `Showing history reachable from ${detail}` : "Select a commit to inspect it."}
              </p>
            )}
          </div>
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
