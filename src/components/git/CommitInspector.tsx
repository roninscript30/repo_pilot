import { useMemo } from "react";
import { useCommitDetail } from "@/hooks/use-git";
import { shortSha, type CommitSummary } from "@/domain/models/commit";
import { splitPatchByFile } from "@/lib/diff";
import { timeAgo, formatDate } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { DiffViewer } from "@/components/diff/DiffViewer";
import { useToast } from "@/components/ui/toast-context";

const STATUS_ICON: Record<string, "plus" | "trash" | "pencil" | "gitCompare"> = {
  added: "plus",
  removed: "trash",
  renamed: "gitCompare",
  modified: "pencil",
};

interface CommitInspectorProps {
  readonly fullName: string;
  readonly commit: CommitSummary;
}

/** Detail panel for a single commit: metadata, file stats, and diffs. */
export function CommitInspector({ fullName, commit }: CommitInspectorProps) {
  const { toast } = useToast();
  const detail = useCommitDetail(fullName, commit.sha);

  const fileDiffs = useMemo(() => {
    if (!detail.data?.patch) return [];
    return splitPatchByFile(detail.data.patch);
  }, [detail.data]);

  if (detail.isLoading) {
    return (
      <div className="flex justify-center py-14">
        <Spinner label="Loading commit…" size="sm" />
      </div>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <Card className="p-6">
        <EmptyState
          title="Could not load commit"
          description={detail.error instanceof Error ? detail.error.message : "The commit may be unreachable from this branch."}
        />
      </Card>
    );
  }

  const data = detail.data;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-sm font-bold text-surface-900 dark:text-surface-100">{data.subject}</p>
            {data.message !== data.subject ? (
              <p className="mt-1 whitespace-pre-wrap text-xs text-surface-500">{data.message.slice(data.subject.length).trim()}</p>
            ) : null}
          </div>
          <Button
            size="sm"
            variant="ghost"
            title="Copy full SHA"
            onClick={() => {
              void navigator.clipboard.writeText(data.sha);
              toast({ title: "SHA copied", description: shortSha(data.sha), tone: "success" });
            }}
          >
            <Icon name="copy" size={13} />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-surface-100 px-4 py-2.5 text-2xs text-surface-500 dark:border-surface-700/60">
          <span className="inline-flex items-center gap-1.5">
            <Avatar name={data.author.name} src={data.author.avatarUrl} size="sm" />
            <span className="text-surface-700 dark:text-surface-300">{data.author.name}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="clock" size={11} />
            {data.committedAt ? `${timeAgo(data.committedAt)} · ${formatDate(data.committedAt)}` : "unknown time"}
          </span>
          <span className="inline-flex items-center gap-1 font-mono">
            <Icon name="gitCommit" size={11} />
            {data.sha}
          </span>
          <span className="ml-auto inline-flex items-center gap-2 font-mono">
            <span className="text-success-700 dark:text-success-600">+{data.additions}</span>
            <span className="text-danger-700 dark:text-danger-600">−{data.deletions}</span>
          </span>
        </div>
        {data.parents.length > 1 ? (
          <div className="flex items-center gap-1.5 border-t border-surface-100 px-4 py-2 text-2xs text-surface-500 dark:border-surface-700/60">
            <Icon name="gitMerge" size={11} />
            Merge commit
            <span className="font-mono">{data.parents.map(shortSha).join(", ")}</span>
          </div>
        ) : null}
      </Card>

      <Card>
        <ul className="divide-y divide-surface-100 dark:divide-surface-700/60">
          {data.changes.length === 0 ? (
            <li className="px-4 py-3 text-xs text-surface-500">No file changes in this commit.</li>
          ) : (
            data.changes.map((change) => (
              <li key={change.filename} className="flex items-center gap-2 px-4 py-2">
                <Icon name={STATUS_ICON[change.status] ?? "pencil"} size={13} className="text-surface-400" />
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-surface-700 dark:text-surface-300">
                  {change.filename}
                </span>
                <span className="shrink-0 font-mono text-[11px]">
                  <span className="text-success-700 dark:text-success-600">+{change.additions}</span>
                  <span className="mx-1 text-surface-300">/</span>
                  <span className="text-danger-700 dark:text-danger-600">−{change.deletions}</span>
                </span>
              </li>
            ))
          )}
        </ul>
      </Card>

      {fileDiffs.length > 0 ? (
        <div className="space-y-3">
          {fileDiffs.map((file) => (
            <DiffViewer key={file.filename} change={file} patch={file.patch} />
          ))}
        </div>
      ) : data.patch ? (
        <Card>
          <pre className="code-canvas max-h-96 overflow-auto p-3 text-xs text-surface-600 dark:text-surface-300">
            <code>{data.patch}</code>
          </pre>
        </Card>
      ) : null}
    </div>
  );
}
