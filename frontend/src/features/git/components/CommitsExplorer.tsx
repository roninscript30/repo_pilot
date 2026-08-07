import { useEffect, useMemo, useState } from "react";
import { useBranches } from "@/features/code/hooks";
import {
  useCommits,
  useLocalBranches,
  useLocalCommits,
  useLocalWorktree,
} from "@/features/git/hooks";
import { CommitGraph } from "@/features/git/components/CommitGraph";
import { CommitInspector } from "@/features/git/components/CommitInspector";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Icon } from "@/components/ui/Icon";
import { SearchInput } from "@/components/ui/SearchInput";
import { SelectField } from "@/components/ui/SelectField";
import type { CommitSummary } from "@/domain/models/commit";

interface CommitsExplorerProps {
  readonly fullName: string;
  readonly defaultBranch: string | null;
  /** When set, history is read from the local Git runtime instead of GitHub. */
  readonly localPath?: string | null;
}

const PAGE_SIZE = 50;

/** Git commits workspace: branch filter, search, pagination, and inspector. */
export function CommitsExplorer({ fullName, defaultBranch, localPath = null }: CommitsExplorerProps) {
  const isLocal = Boolean(localPath);

  const [branch, setBranch] = useState(defaultBranch ?? "main");
  const [branchTouched, setBranchTouched] = useState(false);
  const [selectedSha, setSelectedSha] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  // Both hooks are always called (rules of hooks); only one is enabled.
  const branches = useBranches(fullName, !isLocal);
  const localBranches = useLocalBranches(localPath, isLocal);
  const worktree = useLocalWorktree(localPath, isLocal);
  const commits = useCommits(fullName, branch, !isLocal);
  const localCommits = useLocalCommits(localPath, branch, limit, isLocal);

  // Default the branch selector to the working tree's current branch once it
  // is known, unless the user already picked one.
  useEffect(() => {
    if (isLocal && !branchTouched && worktree.data?.currentBranch) {
      setBranch(worktree.data.currentBranch);
    }
  }, [isLocal, branchTouched, worktree.data?.currentBranch]);

  const branchOptions = useMemo(() => {
    const names =
      (isLocal ? localBranches.data : branches.data?.branches)?.map((item) => item.name) ?? [];
    const all = names.length > 0 ? names : [branch];
    return all.map((name) => ({ value: name, label: name }));
  }, [branches.data, localBranches.data, isLocal, branch]);

  const allCommits = isLocal ? localCommits.data : commits.data;

  const filteredCommits = useMemo(() => {
    if (!allCommits) return allCommits;
    const needle = query.trim().toLowerCase();
    if (!needle) return allCommits;
    return allCommits.filter((commit) => {
      return (
        commit.sha.toLowerCase().includes(needle) ||
        commit.subject.toLowerCase().includes(needle) ||
        commit.message.toLowerCase().includes(needle)
      );
    });
  }, [allCommits, query]);

  const selectedCommit: CommitSummary | null = useMemo(() => {
    const found = allCommits?.find((item) => item.sha === selectedSha);
    return found ?? allCommits?.[0] ?? null;
  }, [allCommits, selectedSha]);

  const isLoading = isLocal ? localCommits.isLoading : commits.isLoading;
  const isError = isLocal ? localCommits.isError : commits.isError;
  const error = isLocal ? localCommits.error : commits.error;
  const refetch = isLocal ? localCommits.refetch : commits.refetch;

  return (
    <div className="grid min-h-[480px] grid-cols-1 gap-4 xl:grid-cols-[minmax(340px,420px)_1fr]">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Icon name="gitBranch" size={13} className="text-surface-400" />
          <SelectField
            aria-label="Branch"
            options={branchOptions}
            value={branch}
            onChange={(event) => {
              setBranch(event.target.value);
              setBranchTouched(true);
              setSelectedSha(null);
            }}
            className="w-56 text-xs"
          />
        </div>

        {isLocal ? (
          <div className="mb-2">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search subject, message, SHA…"
              ariaLabel="Search commits"
            />
          </div>
        ) : null}

        {isError ? (
          <ErrorState
            title="Could not load commits"
            description={error instanceof Error ? error.message : "The branch may be empty."}
            onRetry={() => void refetch()}
          />
        ) : allCommits && allCommits.length === 0 ? (
          <Card>
            <EmptyState title="No commits" description="This branch has no commits yet." />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="max-h-[68vh] overflow-y-auto">
              <CommitGraph
                commits={filteredCommits ?? []}
                selectedSha={selectedCommit?.sha ?? null}
                onSelect={setSelectedSha}
              />
            </div>
          </Card>
        )}

        {isLocal && allCommits && allCommits.length >= limit ? (
          <div className="mt-2 flex justify-center">
            <Button size="sm" variant="secondary" onClick={() => setLimit((current) => current + PAGE_SIZE)}>
              <Icon name="gitCommit" size={13} />
              Load more commits
            </Button>
          </div>
        ) : null}

        {isLocal && query.trim() && filteredCommits && filteredCommits.length === 0 ? (
          <p className="mt-2 px-1 text-2xs text-surface-500">
            No loaded commits match “{query.trim()}”. Narrow the search or load more.
          </p>
        ) : null}

        {isLoading ? (
          <p className="mt-2 text-2xs text-surface-500">Loading commits…</p>
        ) : null}
      </div>

      <div>
        {selectedCommit ? (
          <CommitInspector fullName={fullName} commit={selectedCommit} localPath={localPath} />
        ) : (
          <Card>
            <EmptyState title="Select a commit" description="Choose a commit from the graph to inspect its changes." />
          </Card>
        )}
      </div>
    </div>
  );
}
