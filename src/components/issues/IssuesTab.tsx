import { useState } from "react";
import { useCreateIssue, useIssues } from "@/hooks/use-issues";
import type { Issue } from "@/domain/models/issue";
import { timeAgo } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { TextArea } from "@/components/ui/TextArea";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast } from "@/components/ui/toast-context";

function IssueRow({ issue, selected, onSelect }: { issue: Issue; selected: boolean; onSelect: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
          selected ? "bg-accent-100/70 dark:bg-accent-100/15" : "hover:bg-surface-50 dark:hover:bg-surface-700/40"
        }`}
      >
        <Icon
          name={issue.state === "open" ? "issue" : "issueClosed"}
          size={14}
          className={issue.state === "open" ? "text-success-600 dark:text-success-500" : "text-accent-600 dark:text-accent-500"}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-semibold text-surface-900 dark:text-surface-100">
              {issue.title}
            </span>
            {issue.labels.length > 0 ? (
              <span className="hidden shrink-0 items-center gap-1 md:inline-flex">
                {issue.labels.slice(0, 3).map((label) => (
                  <Tag key={label.name} label={label.name} color={label.color} />
                ))}
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-2xs text-surface-400">
            <span>#{issue.number}</span>
            <span className="inline-flex items-center gap-1">
              <Avatar name={issue.author.login} src={issue.author.avatarUrl} size="xs" />
              {issue.author.login}
            </span>
            <span>opened {issue.createdAt ? timeAgo(issue.createdAt) : "unknown"}</span>
            {issue.assignees.length > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Icon name="users" size={10} /> {issue.assignees.length}
              </span>
            ) : null}
          </div>
        </div>
        {issue.comments !== null && issue.comments.length > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-2xs text-surface-400">
            <Icon name="message" size={11} /> {issue.comments.length}
          </span>
        ) : null}
        <Badge tone={issue.state === "open" ? "success" : "accent"}>
          {issue.state === "open" ? "Open" : "Closed"}
        </Badge>
      </button>
    </li>
  );
}

function CreateIssueDialog({ fullName, onClose }: { fullName: string; onClose: () => void }) {
  const { toast } = useToast();
  const createIssue = useCreateIssue(fullName);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (title.trim().length === 0) return;
    setError(null);
    createIssue.mutate(
      title.trim() && body.trim() ? { title: title.trim(), body: body.trim() } : { title: title.trim() },
      {
        onSuccess: (issue) => {
          toast({ title: `Issue #${issue.number} created`, tone: "success" });
          onClose();
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Could not create issue.");
        },
      },
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="New issue"
      description={`Create an issue in ${fullName}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={title.trim().length === 0 || createIssue.isPending}>
            {createIssue.isPending ? "Creating…" : "Create issue"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <TextField
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Short summary of the problem"
          autoFocus
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <TextArea
          label="Description"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Optional details, steps to reproduce… (markdown supported)"
          rows={6}
        />
        {error ? <p role="alert" className="text-xs text-danger-600">{error}</p> : null}
      </div>
    </Dialog>
  );
}

interface IssuesTabProps {
  readonly fullName: string;
}

/** Issues workspace: filterable list plus create dialog. */
export function IssuesTab({ fullName }: IssuesTabProps) {
  const [state, setState] = useState<"open" | "closed" | "all">("open");
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const issues = useIssues(fullName, state);

  const selected = issues.data?.find((issue) => issue.number === selectedNumber) ?? issues.data?.[0] ?? null;

  return (
    <div className="grid min-h-[480px] grid-cols-1 gap-4 xl:grid-cols-[minmax(340px,440px)_1fr]">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <SegmentedControl
            ariaLabel="Issue state"
            options={[
              { value: "open", label: "Open" },
              { value: "closed", label: "Closed" },
              { value: "all", label: "All" },
            ]}
            value={state}
            onChange={(value) => {
              setState(value as "open" | "closed" | "all");
              setSelectedNumber(null);
            }}
          />
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Icon name="plus" size={13} /> New issue
          </Button>
        </div>
        {issues.isError ? (
          <ErrorState
            title="Could not load issues"
            description={issues.error instanceof Error ? issues.error.message : "Check scopes and try again."}
            onRetry={() => void issues.refetch()}
          />
        ) : issues.data && issues.data.length === 0 ? (
          <Card><EmptyState title="No issues" description="There are no issues in this state." /></Card>
        ) : (
          <Card className="overflow-hidden">
            <ul className="max-h-[68vh] divide-y divide-surface-100 overflow-y-auto dark:divide-surface-700/60">
              {(issues.data ?? []).map((issue) => (
                <IssueRow
                  key={issue.id}
                  issue={issue}
                  selected={issue.number === selected?.number}
                  onSelect={() => setSelectedNumber(issue.number)}
                />
              ))}
            </ul>
          </Card>
        )}
      </div>

      <div>
        {selected ? (
          <Card>
            <div className="p-4">
              <div className="flex items-center gap-2">
                <h2 className="min-w-0 flex-1 truncate text-base font-bold text-surface-900 dark:text-surface-100">
                  {selected.title}
                </h2>
                <span className="shrink-0 text-xs text-surface-400">#{selected.number}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-surface-400">
                <span className="inline-flex items-center gap-1.5">
                  <Avatar name={selected.author.login} src={selected.author.avatarUrl} size="xs" />
                  {selected.author.login}
                </span>
                <span>opened {selected.createdAt ? timeAgo(selected.createdAt) : "unknown"}</span>
                <span>updated {selected.updatedAt ? timeAgo(selected.updatedAt) : "unknown"}</span>
                <span className="ml-auto">
                  <a
                    href={selected.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-surface-200 px-2 text-xs text-surface-600 transition-colors hover:bg-surface-100 dark:border-surface-600 dark:text-surface-300 dark:hover:bg-surface-700"
                  >
                    <Icon name="external" size={12} /> GitHub
                  </a>
                </span>
              </div>
              {selected.labels.length > 0 ? (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {selected.labels.map((label) => <Tag key={label.name} label={label.name} color={label.color} />)}
                </div>
              ) : null}
            </div>
            {selected.body ? (
              <div className="border-t border-surface-100 p-4 text-sm leading-relaxed text-surface-700 dark:border-surface-700/60 dark:text-surface-300">
                {selected.body.split("\n").map((line, index) => (
                  <p key={index} className={line.trim() === "" ? "h-3" : ""}>{line}</p>
                ))}
              </div>
            ) : (
              <div className="border-t border-surface-100 px-4 py-3 text-xs text-surface-500 dark:border-surface-700/60">
                No description provided.
              </div>
            )}
          </Card>
        ) : (
          <Card><EmptyState title="Select an issue" description="Choose an issue to see its details." /></Card>
        )}
      </div>

      {createOpen ? <CreateIssueDialog fullName={fullName} onClose={() => setCreateOpen(false)} /> : null}
    </div>
  );
}
