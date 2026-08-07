import { useState } from "react";
import { usePullRequestDetail, usePullRequests } from "@/features/pulls/hooks";
import { usePullRequestFiles, usePullRequestCommits, usePullRequestReviews } from "@/features/pulls/hooks";
import type { PullRequest, PullRequestState } from "@/domain/models/pull-request";
import { timeAgo } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Tabs } from "@/components/ui/Tabs";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { MarkdownView } from "@/components/markdown/MarkdownView";
import { DiffViewer } from "@/features/git/components/DiffViewer";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

const STATE_BADGE: Record<PullRequestState, { label: string; tone: "success" | "danger" | "accent" }> = {
  open: { label: "Open", tone: "success" },
  merged: { label: "Merged", tone: "accent" },
  closed: { label: "Closed", tone: "danger" },
};

const REVIEW_STATE: Record<string, { icon: "checkCircle" | "x" | "message" | "clock"; label: string }> = {
  approved: { icon: "checkCircle", label: "Approved" },
  changes_requested: { icon: "x", label: "Changes requested" },
  commented: { icon: "message", label: "Commented" },
  pending: { icon: "clock", label: "Pending" },
};

const REVIEW_ICON_COLOR: Record<string, string> = {
  approved: "text-success-600 dark:text-success-500",
  changes_requested: "text-danger-600 dark:text-danger-500",
  commented: "text-info-600 dark:text-info-500",
  pending: "text-warning-600 dark:text-warning-500",
};

function PullRequestRow({ pull, selected, onSelect }: { pull: PullRequest; selected: boolean; onSelect: () => void }) {
  const meta = STATE_BADGE[pull.state];
  const review = REVIEW_STATE[pull.reviewDecision];
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
          name={pull.state === "open" ? "gitPull" : pull.state === "merged" ? "gitMerge" : "gitPull"}
          size={14}
          className={pull.state === "open" ? "text-success-600 dark:text-success-500" : pull.state === "merged" ? "text-accent-600 dark:text-accent-500" : "text-surface-400"}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-semibold text-surface-900 dark:text-surface-100">
              {pull.title}
            </span>
            {pull.isDraft ? <Badge>draft</Badge> : null}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-2xs text-surface-400">
            <span>#{pull.number}</span>
            <span className="inline-flex items-center gap-1">
              <Avatar name={pull.author.login} src={pull.author.avatarUrl} size="xs" />
              {pull.author.login}
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="gitBranch" size={10} />
              {pull.headBranch} → {pull.baseBranch}
            </span>
            {pull.updatedAt ? <span>{timeAgo(pull.updatedAt)}</span> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {review ? (
            <span className={`hidden items-center gap-1 text-2xs sm:inline-flex ${REVIEW_ICON_COLOR[pull.reviewDecision] ?? ""}`} title={review.label}>
              <Icon name={review.icon} size={12} />
            </span>
          ) : null}
          {pull.mergeable === false ? (
            <span className="hidden text-2xs text-danger-600 sm:inline" title="Merge conflicts">
              conflicts
            </span>
          ) : null}
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </div>
      </button>
    </li>
  );
}

interface PullRequestDetailProps {
  readonly fullName: string;
  readonly pull: PullRequest;
}

function PullRequestDetail({ fullName, pull }: PullRequestDetailProps) {
  const [section, setSection] = useState("files");
  const detail = usePullRequestDetail(fullName, pull.number);
  const files = usePullRequestFiles(fullName, pull.number);
  const commits = usePullRequestCommits(fullName, pull.number);
  const reviews = usePullRequestReviews(fullName, pull.number);

  const isLoading = detail.isLoading || files.isLoading || commits.isLoading || reviews.isLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-14">
        <Spinner label="Loading pull request…" size="sm" />
      </div>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <Card className="p-6">
        <ErrorState
          title="Could not load pull request"
          description={detail.error instanceof Error ? detail.error.message : "The pull request may have been deleted."}
          onRetry={() => void detail.refetch()}
        />
      </Card>
    );
  }

  const filesData = files.data ?? [];
  const commitsData = commits.data ?? [];
  const reviewsData = reviews.data ?? [];
  const additions = filesData.reduce((sum, file) => sum + file.additions, 0);
  const deletions = filesData.reduce((sum, file) => sum + file.deletions, 0);

  return (
    <div className="space-y-4">
      <Card>
        <div className="p-4">
          <div className="flex items-center gap-2">
            <h2 className="min-w-0 flex-1 truncate text-base font-bold text-surface-900 dark:text-surface-100">
              {pull.title}
            </h2>
            <span className="shrink-0 text-xs text-surface-400">#{pull.number}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-surface-400">
            <span className="inline-flex items-center gap-1.5">
              <Avatar name={pull.author.login} src={pull.author.avatarUrl} size="xs" />
              {pull.author.login}
            </span>
            <span>opened {pull.createdAt ? timeAgo(pull.createdAt) : "unknown"}</span>
            <span className="inline-flex items-center gap-1">
              <Icon name="gitBranch" size={11} />
              {pull.headBranch}
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="gitCompare" size={11} />
              {pull.baseBranch}
            </span>
            {pull.mergeable !== null ? (
              <span className={`font-medium ${pull.mergeable ? "text-success-600 dark:text-success-500" : "text-danger-600 dark:text-danger-500"}`}>
                {pull.mergeable ? "Mergeable" : "Conflicts"}
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Badge tone={STATE_BADGE[pull.state].tone}>{STATE_BADGE[pull.state].label}</Badge>
            {pull.isDraft ? <Badge>draft</Badge> : null}
            <span className="font-mono text-2xs">
              <span className="text-success-700 dark:text-success-600">+{additions}</span>
              <span className="mx-1 text-surface-300">/</span>
              <span className="text-danger-700 dark:text-danger-600">−{deletions}</span>
              <span className="ml-2 text-surface-400">{filesData.length} files</span>
            </span>
            <span className="ml-auto">
              <a
                href={pull.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex h-7 items-center gap-1 rounded-md border border-surface-200 px-2 text-xs text-surface-600 transition-colors hover:bg-surface-100 dark:border-surface-600 dark:text-surface-300 dark:hover:bg-surface-700"
              >
                <Icon name="external" size={12} /> GitHub
              </a>
            </span>
          </div>
        </div>
        {pull.body ? (
          <div className="border-t border-surface-100 px-4 py-3 dark:border-surface-700/60">
            <MarkdownView markdown={pull.body} />
          </div>
        ) : null}
      </Card>

      <Tabs
        ariaLabel="Pull request sections"
        size="sm"
        activeId={section}
        onChange={setSection}
        items={[
          { id: "files", label: "Files changed", icon: "fileText", badge: filesData.length },
          { id: "commits", label: "Commits", icon: "gitCommit", badge: commitsData.length },
          { id: "reviews", label: "Reviews", icon: "message", badge: reviewsData.length },
        ]}
      />

      {section === "files" ? (
        filesData.length === 0 ? (
          <Card><EmptyState title="No file changes" description="This pull request does not change any files." /></Card>
        ) : (
          <div className="space-y-3">
            {filesData.map((file) => (
              <DiffViewer key={file.filename} change={file} patch={file.patch} />
            ))}
          </div>
        )
      ) : section === "commits" ? (
        commitsData.length === 0 ? (
          <Card><EmptyState title="No commits" description="This pull request has no commits." /></Card>
        ) : (
          <Card>
            <ul className="divide-y divide-surface-100 dark:divide-surface-700/60">
              {commitsData.map((commit) => (
                <li key={commit.sha} className="flex items-center gap-2.5 px-4 py-2">
                  <Avatar name={commit.author.name} src={commit.author.avatarUrl} size="xs" />
                  <span className="min-w-0 flex-1 truncate text-xs text-surface-700 dark:text-surface-300">{commit.subject}</span>
                  <span className="shrink-0 font-mono text-2xs text-surface-400">{commit.shortSha}</span>
                </li>
              ))}
            </ul>
          </Card>
        )
      ) : reviewsData.length === 0 ? (
        <Card><EmptyState title="No reviews yet" description="This pull request has not been reviewed." /></Card>
      ) : (
        <div className="space-y-3">
          {reviewsData.map((review) => {
            const meta = REVIEW_STATE[review.state] ?? { icon: "message" as const, label: review.state };
            return (
              <Card key={review.id}>
                <div className="flex items-center gap-2 px-4 py-2.5">
                  <Avatar name={review.author.login} src={review.author.avatarUrl} size="xs" />
                  <span className="text-xs font-medium text-surface-800 dark:text-surface-200">{review.author.login}</span>
                  <span className={`inline-flex items-center gap-1 text-2xs ${REVIEW_ICON_COLOR[review.state] ?? "text-surface-400"}`}>
                    <Icon name={meta.icon} size={11} /> {meta.label}
                  </span>
                  {review.submittedAt ? <span className="ml-auto text-2xs text-surface-400">{timeAgo(review.submittedAt)}</span> : null}
                </div>
                {review.body ? (
                  <div className="border-t border-surface-100 px-4 py-2.5 text-xs text-surface-600 dark:border-surface-700/60 dark:text-surface-300">
                    {review.body}
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface PullsTabProps {
  readonly fullName: string;
}

/** Pull requests workspace: filterable list plus detail inspector. */
export function PullsTab({ fullName }: PullsTabProps) {
  const [state, setState] = useState<"open" | "closed" | "all">("open");
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const pulls = usePullRequests(fullName, state);

  const selected = pulls.data?.find((pull) => pull.number === selectedNumber) ?? pulls.data?.[0] ?? null;

  return (
    <div className="grid min-h-[480px] grid-cols-1 gap-4 xl:grid-cols-[minmax(340px,440px)_1fr]">
      <div>
        <div className="mb-2">
          <SegmentedControl
            ariaLabel="Pull request state"
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
        </div>
        {pulls.isError ? (
          <ErrorState
            title="Could not load pull requests"
            description={pulls.error instanceof Error ? pulls.error.message : "Check scopes and try again."}
            onRetry={() => void pulls.refetch()}
          />
        ) : pulls.data && pulls.data.length === 0 ? (
          <Card><EmptyState title="No pull requests" description="There are no pull requests in this state." /></Card>
        ) : (
          <Card className="overflow-hidden">
            <ul className="max-h-[68vh] divide-y divide-surface-100 overflow-y-auto dark:divide-surface-700/60">
              {(pulls.data ?? []).map((pull) => (
                <PullRequestRow
                  key={pull.id}
                  pull={pull}
                  selected={pull.number === selected?.number}
                  onSelect={() => setSelectedNumber(pull.number)}
                />
              ))}
            </ul>
          </Card>
        )}
      </div>

      <div>
        {selected ? (
          <PullRequestDetail fullName={fullName} pull={selected} />
        ) : (
          <Card><EmptyState title="Select a pull request" description="Choose a pull request to review its changes." /></Card>
        )}
      </div>
    </div>
  );
}
