import { useMemo } from "react";
import { useBranches, useFileTree } from "@/features/code/hooks";
import { FileTree } from "@/features/code/FileTree";
import { CodeFileView } from "@/features/code/CodeFileView";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { SelectField } from "@/components/ui/SelectField";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import type { Repository } from "@/domain/models/repository";

interface CodeWorkspaceProps {
  readonly repository: Repository;
  readonly path: string | null;
  readonly branch: string;
  readonly onPathChange: (path: string | null) => void;
  readonly onBranchChange: (branch: string) => void;
}

/** Code explorer: branch selector, file tree, and file viewer. */
export function CodeWorkspace({ repository, path, branch, onPathChange, onBranchChange }: CodeWorkspaceProps) {
  const branches = useBranches(repository.fullName);
  const tree = useFileTree(repository.fullName, branch);

  const branchOptions = useMemo(() => {
    const names = branches.data?.branches.map((item) => item.name) ?? [];
    const all = names.length > 0 ? names : [branch];
    return all.map((name) => ({ value: name, label: name }));
  }, [branches.data, branch]);

  const breadcrumb = useMemo(() => {
    if (!path) return [];
    const segments = path.split("/");
    const crumbs: { label: string; path: string }[] = [];
    let current = "";
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      crumbs.push({ label: segment, path: current });
    }
    return crumbs;
  }, [path]);

  return (
    <div className="grid min-h-[480px] grid-cols-1 gap-4 lg:grid-cols-[minmax(220px,280px)_1fr]">
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-surface-200 px-3 py-2 dark:border-surface-700">
          <Icon name="gitBranch" size={13} className="text-surface-400" />
          <SelectField
            aria-label="Branch"
            options={branchOptions}
            value={branch}
            onChange={(event) => onBranchChange(event.target.value)}
            className="text-xs"
          />
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          <FileTree
            entries={tree.data ?? undefined}
            isLoading={tree.isLoading}
            currentPath={path}
            onSelect={onPathChange}
          />
        </div>
      </Card>

      {path === null ? (
        <Card>
          <EmptyState
            title="Select a file"
            description="Choose a file from the tree to preview its contents."
          />
        </Card>
      ) : tree.isError ? (
        <ErrorState
          title="Could not load file tree"
          description={tree.error instanceof Error ? tree.error.message : "The branch may not exist."}
          onRetry={() => void tree.refetch()}
        />
      ) : (
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-1 px-2 text-xs">
            <button
              type="button"
              onClick={() => onPathChange(null)}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 font-medium text-accent-600 hover:bg-accent-50 dark:text-accent-500 dark:hover:bg-accent-100/10"
            >
              <Icon name="repo" size={12} />
              {repository.name}
            </button>
            {breadcrumb.map((crumb) => (
              <span key={crumb.path} className="flex items-center gap-1">
                <Icon name="chevronRight" size={11} className="text-surface-300" />
                <button
                  type="button"
                  onClick={() => onPathChange(crumb.path)}
                  className={`rounded px-1 py-0.5 ${
                    crumb.path === path
                      ? "font-medium text-surface-800 dark:text-surface-200"
                      : "font-mono text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700/50"
                  }`}
                >
                  {crumb.label}
                </button>
              </span>
            ))}
          </div>
          <CodeFileView fullName={repository.fullName} path={path} ref={branch} />
        </div>
      )}
    </div>
  );
}
