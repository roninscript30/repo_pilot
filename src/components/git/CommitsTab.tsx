import { useMemo, useState } from "react";
import { useBranches } from "@/hooks/use-code";
import { useCommits } from "@/hooks/use-git";
import { CommitGraph } from "@/components/git/CommitGraph";
import { CommitInspector } from "@/components/git/CommitInspector";
import { Card } from "@/components/ui/Card";
import { SelectField } from "@/components/ui/SelectField";
import { Icon } from "@/components/ui/Icon";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

interface CommitsTabProps {
  readonly fullName: string;
  readonly defaultBranch: string | null;
}

/** Git ops workspace: branch selector, commit graph, and commit inspector. */
export function CommitsTab({ fullName, defaultBranch }: CommitsTabProps) {
  const [branch, setBranch] = useState(defaultBranch ?? "main");
  const [selectedSha, setSelectedSha] = useState<string | null>(null);

  const branches = useBranches(fullName);
  const commits = useCommits(fullName, branch);

  const branchOptions = useMemo(() => {
    const names = branches.data?.branches.map((item) => item.name) ?? [];
    const all = names.length > 0 ? names : [branch];
    return all.map((name) => ({ value: name, label: name }));
  }, [branches.data, branch]);

  const selectedCommit = useMemo(() => {
    const found = commits.data?.find((item) => item.sha === selectedSha);
    if (found) return found;
    return commits.data?.[0] ?? null;
  }, [commits.data, selectedSha]);

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
              setSelectedSha(null);
            }}
            className="w-56 text-xs"
          />
        </div>
        {commits.isError ? (
          <ErrorState
            title="Could not load commits"
            description={commits.error instanceof Error ? commits.error.message : "The branch may be empty."}
            onRetry={() => void commits.refetch()}
          />
        ) : commits.data && commits.data.length === 0 ? (
          <Card>
            <EmptyState title="No commits" description="This branch has no commits yet." />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="max-h-[68vh] overflow-y-auto">
              <CommitGraph
                commits={commits.data ?? []}
                selectedSha={selectedCommit?.sha ?? null}
                onSelect={setSelectedSha}
              />
            </div>
          </Card>
        )}
      </div>

      <div>
        {selectedCommit ? (
          <CommitInspector fullName={fullName} commit={selectedCommit} />
        ) : (
          <Card>
            <EmptyState title="Select a commit" description="Choose a commit from the graph to inspect its changes." />
          </Card>
        )}
      </div>
    </div>
  );
}
