import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { SelectField } from "@/components/ui/SelectField";
import { Spinner } from "@/components/ui/Spinner";
import {
  useLocalBranches,
  useLocalWorktree,
  useMergePreview,
  useRefComparison,
} from "@/features/git/hooks";
import { summarizeFiles } from "@/features/git/lib/compare";
import type { RefComparisonFile } from "@/domain/models/git";

interface CompareViewProps {
  readonly path: string;
}

const FILE_STATUS_LABELS: Record<RefComparisonFile["status"], string> = {
  added: "added",
  removed: "removed",
  modified: "modified",
  renamed: "renamed",
};

/**
 * The Compare activity: two refs, their diverging commit lists, the
 * changed files with line stats, and a merge preview that predicts
 * conflicts from the paths changed on both sides.
 */
export function CompareView({ path }: CompareViewProps) {
  const worktree = useLocalWorktree(path);
  const branchesQuery = useLocalBranches(path);

  const currentBranch = worktree.data?.currentBranch ?? null;
  const branches = useMemo(() => branchesQuery.data ?? [], [branchesQuery.data]);

  const [base, setBase] = useState<string>("");
  const [target, setTarget] = useState<string>("");

  const effectiveBase = base || currentBranch || (branches[0]?.name ?? "");
  const effectiveTarget =
    target || branches.find((branch) => branch.name !== effectiveBase)?.name || "";

  const comparison = useRefComparison(path, effectiveBase || null, effectiveTarget || null, effectiveBase.length > 0 && effectiveTarget.length > 0);
  const mergePreview = useMergePreview(path, effectiveTarget || null, effectiveBase || null, effectiveBase.length > 0 && effectiveTarget.length > 0);

  const options = useMemo(
    () => branches.map((branch) => ({ value: branch.name, label: branch.name })),
    [branches],
  );

  if (worktree.isLoading || branchesQuery.isLoading) {
    return (
      <div className="flex justify-center py-14">
        <Spinner label="Reading refs…" size="sm" />
      </div>
    );
  }

  if (branches.length < 2) {
    return (
      <div className="px-6 py-12">
        <EmptyState
          title="Need two branches"
          description="Create at least one more branch to compare refs. Compare needs a base and a target."
        />
      </div>
    );
  }

  const summary = comparison.data ? summarizeFiles(comparison.data.files) : null;
  const previewSummary = mergePreview.data ? summarizeFiles(mergePreview.data.filesChanged) : null;

  return (
    <div className="flex min-h-[480px] flex-col gap-4 px-6 py-5">
      <Card>
        <CardHeader title="Compare refs" subtitle="Base is the reference point; target is measured against it." />
        <div className="flex flex-wrap items-end gap-3 p-4">
          <SelectField
            label="Base"
            id="compare-base"
            value={effectiveBase}
            options={options}
            onChange={(event) => setBase(event.target.value)}
          />
          <Icon name="gitCompare" size={16} className="mb-2.5 text-surface-400" />
          <SelectField
            label="Target"
            id="compare-target"
            value={effectiveTarget}
            options={options}
            onChange={(event) => setTarget(event.target.value)}
          />
        </div>
      </Card>

      {comparison.isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner label="Comparing refs…" size="sm" />
        </div>
      ) : comparison.isError || !comparison.data ? (
        <EmptyState
          title="Comparison failed"
          {...(comparison.error instanceof Error ? { description: comparison.error.message } : {})}
        />
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader
              title={`${comparison.data.targetRef} vs ${comparison.data.baseRef}`}
              subtitle={
                comparison.data.mergeBase
                  ? `merge base ${comparison.data.mergeBase.slice(0, 7)}`
                  : "no common ancestor"
              }
            />
            <div className="space-y-4 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-surface-200 p-3 text-center dark:border-surface-600">
                  <p className="inline-flex items-center gap-1 text-lg font-bold text-success-600 dark:text-success-400">
                    <Icon name="gitAhead" size={15} />
                    {comparison.data.aheadBy}
                  </p>
                  <p className="text-2xs text-surface-500">target ahead of base</p>
                </div>
                <div className="rounded-lg border border-surface-200 p-3 text-center dark:border-surface-600">
                  <p className="inline-flex items-center gap-1 text-lg font-bold text-warning-600 dark:text-warning-400">
                    <Icon name="gitBehind" size={15} />
                    {comparison.data.behindBy}
                  </p>
                  <p className="text-2xs text-surface-500">base ahead of target</p>
                </div>
              </div>

              {summary ? (
                <p className="text-xs text-surface-500">
                  {summary.files} file{summary.files === 1 ? "" : "s"} changed · +{summary.additions} −
                  {summary.deletions}
                </p>
              ) : null}

              {comparison.data.commits.length > 0 ? (
                <div>
                  <h3 className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-surface-400">
                    Commits on target only
                  </h3>
                  <ul className="max-h-48 space-y-1 overflow-y-auto">
                    {comparison.data.commits.map((commit) => (
                      <li key={commit.sha} className="flex items-center gap-2 text-xs">
                        <Icon name="gitCommit" size={11} className="shrink-0 text-surface-400" />
                        <span className="min-w-0 flex-1 truncate text-surface-700 dark:text-surface-300">
                          {commit.subject}
                        </span>
                        <code className="shrink-0 text-2xs text-surface-400">{commit.shortSha}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div>
                <h3 className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-surface-400">
                  Changed files
                </h3>
                <ul className="max-h-64 divide-y divide-surface-100 overflow-y-auto dark:divide-surface-700/60">
                  {comparison.data.files.length === 0 ? (
                    <li className="py-3 text-xs text-surface-500">No file changes between these refs.</li>
                  ) : (
                    comparison.data.files.map((file) => (
                      <li key={file.path} className="flex items-center gap-2 py-1.5 text-xs">
                        <Badge tone={statusTone(file.status)}>{FILE_STATUS_LABELS[file.status]}</Badge>
                        <span className="min-w-0 flex-1 truncate text-surface-700 dark:text-surface-300">
                          {file.path}
                        </span>
                        <span className="shrink-0 text-2xs">
                          <span className="text-success-600 dark:text-success-400">+{file.additions}</span>{" "}
                          <span className="text-danger-600 dark:text-danger-400">−{file.deletions}</span>
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Merge preview"
              subtitle={`Merging ${mergePreview.data?.headRef ?? ""} into ${mergePreview.data?.targetRef ?? ""}`}
            />
            <div className="space-y-4 p-4">
              {mergePreview.isLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner label="Simulating merge…" size="sm" />
                </div>
              ) : mergePreview.isError || !mergePreview.data ? (
                <p className="text-xs text-surface-500">Merge preview unavailable.</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={mergePreview.data.canMerge ? "success" : "danger"}>
                      {mergePreview.data.canMerge
                        ? mergePreview.data.fastForward
                          ? "fast-forward merge"
                          : "clean merge"
                        : "conflicts expected"}
                    </Badge>
                    {mergePreview.data.fastForward ? <Badge tone="neutral">fast-forward</Badge> : null}
                  </div>
                  {previewSummary ? (
                    <p className="text-xs text-surface-500">
                      {previewSummary.files} file{previewSummary.files === 1 ? "" : "s"} would change · +
                      {previewSummary.additions} −{previewSummary.deletions}
                    </p>
                  ) : null}
                  {mergePreview.data.conflictPaths.length > 0 ? (
                    <div>
                      <h3 className="mb-1.5 flex items-center gap-1 text-2xs font-semibold uppercase tracking-wide text-danger-600 dark:text-danger-400">
                        <Icon name="alertCircle" size={12} />
                        Predicted conflicts
                      </h3>
                      <ul className="max-h-40 space-y-1 overflow-y-auto">
                        {mergePreview.data.conflictPaths.map((path) => (
                          <li key={path} className="truncate font-mono text-xs text-surface-600 dark:text-surface-300">
                            {path}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <p className="text-2xs text-surface-400">
                    Preview is a simulation on the merge base; no files are written.
                  </p>
                </>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function statusTone(status: RefComparisonFile["status"]): "neutral" | "success" | "warning" | "danger" | "accent" {
  switch (status) {
    case "added":
      return "success";
    case "removed":
      return "danger";
    case "modified":
      return "warning";
    case "renamed":
      return "accent";
  }
}
